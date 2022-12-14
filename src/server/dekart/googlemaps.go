package dekart

import (
	"os"
	"bytes"
	"context"
	"dekart/src/proto"
	"dekart/src/server/uuid"
	"fmt"
	"io/ioutil"
	"net/http"
	"encoding/json"
	"time"
	"strconv"

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

	log.Info().Msg("Success API Call")
	fmt.Printf("\n")
	fmt.Println(string(body))

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
		"INSERT INTO map_sessions (session_id, expiration, session_token) VALUES ($1, $2, $3)",
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