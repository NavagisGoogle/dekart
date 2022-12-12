# Steps on how to setup development environment (without having to build in docker)

(Note: This was successfully tested in fresh Ubuntu 18.04 LTS - using VirtualBox)

## A. Setup Appropriate Version of Node
### 1. Install curl
```
sudo apt update && sudo apt install curl
```

### 2. Install Node v16.x
```
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Confirm node version
```
node -v
```

**Note**: NPM v18 will also be installed together with Node

## B. Setup Local Postgresql Server

### 1. Install necessary certificates
```
sudo apt install wget ca-certificates
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
```
```
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" >> /etc/apt/sources.list.d/pgdg.list'
sudo apt update
```

### 2. Actual Postgres Installation
```
apt install postgresql postgresql-contrib
```

### 3. Check postgresql status
```
service postgresql status
```

### 4. Initialize psql
```
sudo -u postgres psql
```

### 5. Set initial password
```
\password postgres
```

### 6. Create the necessary database
Any name will do as long as you will use it in your DEKART_POSTGRES_DB Variable
```
CREATE DATABASE [name of db];
```
There is no need to create the metadata tables for dekart since migration will do just that.

## C. Setup Go lang
### 1. Download Go lang
```
curl -O -L "https://golang.org/dl/go1.17.1.linux-amd64.tar.gz"
wget -L "https://golang.org/dl/go1.17.1.linux-amd64.tar.gz"
```

### 2. Extract go lang from tar.gz file
```
tar -xf "go1.17.1.linux-amd64.tar.gz"
sudo chown -R root:root ./go
```

### 3. Move the extracted binary to /usr/local
```
sudo mv -v go /usr/local
```

### 4. Setup go lang PATH environment (IMPORTANT!)
```
nano ~/.bash_profile
```
Append the following two lines
```
export GOPATH=$HOME/go
export PATH=$PATH:/usr/local/go/bin:$GOPATH/bin
```

### 5. Source the new env variables
```
source ~/.bash_profile
go version
```

(**NOTE**: You may need to perform `source` every time you start the vm)

## D. *Main Event*: Setup the Repo
### 1. Clone repo
Note: Make sure you are in your working directory (e.g. `/var/www/...`) and also make sure you have appropriate access permissions for the repo
```
git clone https://github.com/NavagisGoogle/dekart.git
```

### 2. Edit export_variables.sh to set the appropriate env variables for the application

### 3. Load the environment variables from export_variables.sh
```
source export_variables.sh
```

### 4. Edit the .env.development file. Change the `localhost` into your network IP
For example:
```
REACT_APP_API_HOST=http://192.168.xxx.xxx:8080
```

### 5. Setup Github [Personal Access Token](https://github.com/settings/tokens) so you are able to download @dekart-xyz/kepler.gl package

### 6. Generate a new classic token with *read:packages* privilege.

### 7. Create .npmrc file and add the following lines
Use the generated personal access token in the _authToken query parameter
```
@OWNER:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${PERSONAL ACCESS TOKEN}
```

### 8. Install the repo dependencies
```
npm i --legacy-peer-deps
```

### 9. Build the go lang server (This will install all the application dependencies)
```
cd dekart
go build ./src/server
```

### 10. Start the backend application
```
go run src/server/main.go
```

### 11. Start the frontend application. 
This should take at most 30 seconds as opposed to rebuilding the application over again for every change you implement in the application
```
npm start
```

### 12. Test the application in your browser
```
http://<network-ip>:3000
```

### CONGRATULATIONS! You have successfully setup the development environment of dekart.
---
## E. Setup Protocol Buffer Compiler (Optional)
### 1. Install protoc compiler

*IMPORTANT* Make sure you are outside dekart working directory
```
curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v3.14.0/protoc-3.14.0-linux-x86_64.zip
```
### 2. Unzip package to /usr/local
```
unzip -o protoc-3.14.0-linux-${PLATFORM}.zip -d /usr/local bin/protoc
unzip -o protoc-3.14.0-linux-${PLATFORM}.zip -d /usr/local 'include/*'
rm -f protoc-3.14.0-linux-${PLATFORM}.zip
```
### 3. Install buf
```
 curl -sSL "https://github.com/bufbuild/buf/releases/download/v0.33.0/buf-$(uname -s)-$(uname -m)" -o "/usr/local/bin/buf"
 chmod +x "/usr/local/bin/buf"
```

### 4. Install protoc plugins for protoc (js, ts, and go)
protoc plugin for go
```
go get google.golang.org/protobuf/cmd/protoc-gen-go
go get google.golang.org/grpc/cmd/protoc-gen-go-grpc
```

protoc plugin for js
```
 curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v3.14.0/protobuf-js-3.14.0.zip
 unzip -o protobuf-js-3.14.0.zip -d ./protobuf-js-3.14.0
 cd protobuf-js-3.14.0/protobuf-3.14.0/js
 npm install
```

protoc plugin for ts
```
# Go back to the previous directory
cd ../../..
npm install -g ts-protoc-gen
```
### 5. Get inside dekart directory
```
cd dekart
```

### 6. Before building .proto file, make sure you back up the older generated protocol buffer files in case you want to revert
```
mkdir -p src/proto_backup
mv src/proto/* src/proto_backup
```

### 7. To build .proto file into language-specific protocol buffer execute the protoc command
```
protoc --plugin="protoc-gen-ts=/usr/lib/node_modules/ts-protoc-gen/bin/protoc-gen-ts" --js_out="import_style=commonjs,binary:src" --ts_out="service=grpc-web:src" --go_out="src" --go-grpc_out="src" proto/dekart.proto
```

This will build the .proto file into protocol buffers specific for go, ts, and js and can then be used in grpc. Adjust the output filepaths accordingly. The .grpc file for go and pb_service files are also generated.

**Note**: Normally, this is not needed unless you need to add another endpoint or need to change the Schema of an existing API endpoint between the React Frontend and the Go Backend.