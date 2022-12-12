package dekart

import (
	"os"
	"bytes"
	"context"
	"dekart/src/proto"
	"fmt"
	"io/ioutil"
	"net/http"

	"google.golang.org/protobuf/encoding/protojson"
	"github.com/rs/zerolog/log"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

)

const GMAP_BASE_URL = "https://www.googleapis.com/tile/v1"

// Create Session Token from Google Maps Tile API
func (s Server) CreateTileSession(ctx context.Context, req *proto.CreateTileSessionRequest) (*proto.CreateTileSessionResponse, error) {
	log.Info().Msg("Create Session Token was called!")
	fmt.Printf("Create Session Token was called!")

	requestBodyJson, err := protojson.Marshal(req)
	if err != nil {
		fmt.Printf("Could not marshal message")
	}
	fmt.Printf("json data: %s, type: %T\n", requestBodyJson, requestBodyJson)

	gmapApiKey := os.Getenv("DEKART_GOOGLE_MAPS_TOKEN")
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
	fmt.Printf(string(body))

	/*
	TODO: 
		1. Add in migration scripts the creation of table for the storage of session tokens
		2. Perform insert session token in that table using uuid for the session id
		3. Return a response_message to the client
	*/


	return  &proto.CreateTileSessionResponse {
		SessionId: string("This is a sessionid"),
		Expiry: string("1293832"),
		TileWidth: int32(256),
		TileHeight: int32(256),
	}, nil
}