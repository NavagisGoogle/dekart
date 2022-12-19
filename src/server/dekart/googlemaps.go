package dekart

import (
	"os"
	"bytes"
	"context"
	"dekart/src/proto"
	"dekart/src/server/user"
	"dekart/src/server/uuid"
	"fmt"
	"io/ioutil"
	"net/http"
	"encoding/json"
	"time"
	"strconv"

	"github.com/gorilla/mux"
	"google.golang.org/protobuf/encoding/protojson"
	"github.com/rs/zerolog/log"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

)

const GMAP_BASE_URL = "https://www.googleapis.com/tile/v1"

// Create Session Token from Google Maps Tile API
func (s Server) CreateTileSession(ctx context.Context, req *proto.CreateTileSessionRequest) (*proto.CreateTileSessionResponse, error) {
	log.Info().Msg("Create Tile Session was called!")

	requestBodyJson, err := protojson.Marshal(req)
	if err != nil {
		fmt.Printf("Could not marshal message")
		return nil, status.Error(codes.Internal, err.Error())
	}
	fmt.Printf("json data: %s, type: %T\n", requestBodyJson, requestBodyJson)

	gmapApiKey := os.Getenv("REACT_APP_GOOGLE_MAPS_TOKEN")
	fullUrl := fmt.Sprintf("%s/createSession?key=%s", GMAP_BASE_URL, gmapApiKey)
	resp, err := http.Post(fullUrl, "application/json", bytes.NewBuffer(requestBodyJson))
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	log.Info().Msgf("Success API Call for maptype = %s", req.MapType)
	fmt.Printf("\n")

	bodyBytes := []byte(body)
	var jsonResponse map[string]interface{}
	err = json.Unmarshal(bodyBytes, &jsonResponse)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	sessionToken := jsonResponse["session"].(string)
	expiry := jsonResponse["expiry"].(string)

	sessionId, err := s.InsertSession(ctx, sessionToken, expiry)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	tileWidth  := int32(jsonResponse["tileWidth"].(float64))
	tileHeight := int32(jsonResponse["tileHeight"].(float64))

	return  &proto.CreateTileSessionResponse {
		SessionId: *sessionId,
		SessionToken: sessionToken,
		Expiry: expiry,
		TileWidth: tileWidth,
		TileHeight: tileHeight,
	}, nil
}


func (s Server) InsertSession(ctx context.Context, sessionToken string, expiry string) (*string, error) {
	id := uuid.GetUUID()
	expiryInt, err := strconv.ParseInt(expiry, 10, 64)
	if err != nil {
		return nil, err
	}

	tm := time.Unix(expiryInt, 0)

	_, err = s.db.ExecContext(ctx,
		"insert into map_sessions (session_id, expiration, session_token) values ($1, $2, $3)",
		id,
		tm,
		sessionToken,
	)
	if err != nil {
		log.Err(err).Send()
		return nil, err
	}
	return &id, nil
}

type TokenExpiration struct {
	HasNoSessionToken bool `json:"hasNoSessionToken"`
	SessionId string `json:"sessionId"`
	Expired bool `json:"expired"`
	Expiry string `json:"expiry"`
}

// Check Session Token Expiration
func (s Server) ServeCheckTokenExpiration(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ctx := r.Context()
	claims := user.GetClaims(ctx)
	if claims == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	}

	jsonResponse, err := s.CheckTokenExpirationDB(ctx, vars["mapstyle"])

	log.Info().Msgf("Success Check Style Expiration for %s: %s", vars["mapstyle"], *jsonResponse)

	var tokenExpiration TokenExpiration
	err = json.Unmarshal([]byte(*jsonResponse), &tokenExpiration)
	if err != nil {
		log.Err(err).Send()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	tokenExpirationBytes, err := json.Marshal(tokenExpiration)
	if err != nil {
		log.Err(err).Send()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=31536000")
	w.Write(tokenExpirationBytes)
}

func (s Server) CheckTokenExpirationDB(ctx context.Context, mapStyle string) (*string, error) {
	tokenExpiryRows, err := s.db.QueryContext(ctx,
		`
		select
			session_id,
			current_timestamp > expiration - interval '5 days' as expired,
			expiration
		from map_sessions
		where map_style = $1
		limit 1;
		`,
		mapStyle,
	)

	if err != nil {
		log.Err(err).Send()
		return nil, status.Error(codes.Internal, err.Error())
	}
	defer tokenExpiryRows.Close()
	var hasNoSessionToken bool
	var sessionId string
	var expired bool
	var expiration string
	for tokenExpiryRows.Next() {
		err := tokenExpiryRows.Scan(&sessionId, &expired, &expiration)
		if err != nil {
			log.Err(err).Send()
			return nil, status.Error(codes.Internal, err.Error())
		}
	}

	if sessionId == "" {
		hasNoSessionToken = true
		expired = false
	} else {
		hasNoSessionToken = false
	}

	returnJson := fmt.Sprintf(`{
		"hasNoSessionToken": %t,
		"sessionId": "%s",
		"expired": %t,
		"expiry": "%s"
	}`, hasNoSessionToken, sessionId, expired, expiration)

	return &returnJson, nil
}

type RasterTiles struct {
	Type string `json:"type"`
	Tiles []string `json:"tiles"`
	TileSize int32 `json:"tileSize"`
	Attribution string `json:"attribution"`
}

type Sources struct {
	RasterTiles RasterTiles `json:"raster-tiles"`
}

type Layer struct {
	Id string `json:"id"`
	Type string `json:"type"`
	Source string `json:"source"`
	MinZoom int32 `json:"minzoom"`
	MaxZoom int32 `json:"maxzoom"`
}

type MapStyle struct {
	Version int32 `json:"version"`
	Sources Sources `json:"sources"`
	Layers []Layer `json:"layers"`
}


func (s Server) UpdateMapStyle(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ctx := r.Context()
	claims := user.GetClaims(ctx)
	if claims == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	}

	_, err := s.db.ExecContext(ctx,
	`update map_sessions 
	set map_style = $1
	where session_id = $2`,
	vars["mapstyle"],
	vars["sessionid"],
	)
	if err != nil {
		log.Err(err).Send()
		return
	}
}


func (m *MapStyle) ToJsonBytes() ([]byte, error) {
	buffer := &bytes.Buffer{}
	encoder := json.NewEncoder(buffer)
	encoder.SetEscapeHTML(false)
	err := encoder.Encode(m)
	return buffer.Bytes(), err
}


func (s Server) ServeMapStyle(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	ctx := r.Context()
	claims := user.GetClaims(ctx)
	if claims == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	}
	log.Info().Msgf("Success Get Map Style for %s", vars["mapstyle"])

	gmapApiKey := os.Getenv("REACT_APP_GOOGLE_MAPS_TOKEN")
	sessionToken, err := s.GetSessionTokenDB(ctx, vars["mapstyle"])
	if err != nil {
		log.Err(err).Send()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	styleJsonFile, err := os.Open("styles/style-template.json")
	if err != nil {
		log.Err(err).Send()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	defer styleJsonFile.Close()

	jsonBytes, err := ioutil.ReadAll(styleJsonFile)
	if err != nil {
		log.Err(err).Send()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var mapStyle MapStyle
	err = json.Unmarshal(jsonBytes, &mapStyle)
	if err != nil {
		log.Err(err).Send()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tileSource := mapStyle.Sources.RasterTiles.Tiles[0]
	newTileSource := tileSource + fmt.Sprintf("?key=%s&session=%s", gmapApiKey, *sessionToken)

	mapStyle.Sources.RasterTiles.Tiles[0] = newTileSource

	log.Info().Msgf("Tile API %s", mapStyle.Sources.RasterTiles.Tiles[0])

	mapStyleBytes, err := mapStyle.ToJsonBytes()
	if err != nil {
		log.Err(err).Send()
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=31536000")
	w.Write(mapStyleBytes)
}


func (s Server) GetSessionTokenDB(ctx context.Context, mapStyle string) (*string, error) {
	sessionTokenRows, err := s.db.QueryContext(ctx,
		`
		select
			session_token
		from map_sessions
		where map_style = $1
		order by created_at desc
		limit 1
		`,
		mapStyle,
	)

	if err != nil {
		log.Err(err).Send()
		return nil, err
	}

	defer sessionTokenRows.Close()
	var sessionToken string
	for sessionTokenRows.Next() {
		err := sessionTokenRows.Scan(&sessionToken)
		if err != nil {
			log.Err(err).Send()
			return nil, err
		}
	}

	if sessionToken == "" {
		err := fmt.Errorf("Session Token from map_style %s not found", mapStyle)
		log.Warn().Err(err).Send()
		return nil, err
	}

	return &sessionToken, nil
}
