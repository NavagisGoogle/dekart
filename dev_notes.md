## Steps on how to setup development environment sans docker
## There are several ways to approach this build.  These are the details of one approach

## Note: This was successfully tested in fresh Ubuntu 18.04 LTS - using VirtualBox
## If you do not have VirtualBox, download the proper version for you PC here: https://www.virtualbox.org/wiki/Downloads
## If you do not have Ubuntu 18.04 LTS image, download this: https://releases.ubuntu.com/18.04/ubuntu-18.04.6-desktop-amd64.iso
## Create a VM using the Ubuntu image with a suggested 20GB storage drive allocated and enable Guest Additions (checkbox) to enable cut/paste from your desktop

## A. Setup Appropriate Version of Node
## 1. Install curl

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

## **Note**: NPM v18 will also be installed together with Node

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
### Any name will do as long as you will use it in your DEKART_POSTGRES_DB Variable
```
CREATE DATABASE [name of db];
```
### There is no need to create the metadata tables for dekart since migration will do just that.

## C. Setup Go lang
## 1. Download Go lang
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

### 4. Setup go lang PATH environment. IMPORTANT! (Everything is important, but this is ALL CAPS IMPORTANT--with an exclamation point!)
```
nano ~/.bash_profile
```
## Append the following two lines
```
export GOPATH=$HOME/go
export PATH=$PATH:/usr/local/go/bin:$GOPATH/bin
```

### 5. Source the new env variables
```
source ~/.bash_profile
go version
```

## **NOTE**: You may need to perform `source` every time you start the vm

## D. *Main Event*: Setup the Repo
## 1. Clone repo

## Note: Make sure you are in your working directory (e.g. `/var/www/...`) and also make sure you have appropriate access permissions for the repo
```
git clone https://github.com/NavagisGoogle/dekart.git
cd dekart
```

### 2. Copy the export_variables_sample.sh file to export_variables.sh
**WARNING**: Do not directly edit export_variables_sample.sh as it is tracked by git and may be pushed accidentally to the repository
```
cp export_variables_sample.sh export_variables.sh
nano export_variables.sh
```
Then edit export_variables.sh and input all the environment variables for the project

### 3. Load the environment variables from export_variables.sh
```
source export_variables.sh
```

### 4. Edit the .env.development file. Change the `localhost` into your network IP, replacing 192.168.1.189 below, leaving :8080
### to find your current IP, hit Windows key, type cmd, Enter, type ipconfig, Enter

```
REACT_APP_API_HOST=http://192.168.1.189:8080
```

### 4.1 Also change the urls for the mapStyles in the reducer.js
```
const customKeplerGlReducer = keplerGlReducer.initialState({
  mapStyle: {
    mapStyles: {
      streets2d: {
        id: 'streets2d',
        label: 'Street',
        url: 'http://<network-ip>:8080/api/v1/style/gmp-2d-streets.json',
        icon: 'http://<network-ip>:3000/logo192.png'
      },
      satellite: {
        id: 'satellite',
        label: 'Satellite',
        url: 'http://<network-ip>:8080/api/v1/style/gmp-satellite.json',
        icon: 'http://<network-ip>:3000/logo192.png'
      },
      terrain: {
        id: 'terrain',
        label: 'Terrain',
        url: 'http://<network-ip>:8080/api/v1/style/gmp-terrain.json',
        icon: 'http://<network-ip>:3000/logo192.png'
      },
      hybrid: {
        id: 'hybrid',
        label: 'Hybrid',
        url: 'http://<network-ip>:8080/api/v1/style/gmp-hybrid.json',
        icon: 'http://<network-ip>:3000/logo192.png'
      },

    },
    // Set initial map style
    styleType: 'streets2d'
  },
  uiState: {
    currentModal: null,
    activeSidePanel: null
  }
})
```
This is only for development only. The localhost url will be retained during deployment

### 5. Setup Github [Personal Access Token](https://github.com/settings/tokens) so you are able to download @dekart-xyz/kepler.gl package

### 6. Generate a new classic token with *read:packages* privilege.

### 7. Create .npmrc file and add the following lines

## Use the generated personal access token in the _authToken query parameter
```
@OWNER:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${PERSONAL ACCESS TOKEN}
```

### 8. Install the repo dependencies
```
npm ci --legacy-peer-deps
```

### 9. Build the go lang server (This will install all the application dependencies)
```
go build ./src/server
```

### 10. Start the backend application
```
go run src/server/main.go
```

### 11. Start the frontend application. 
## This should take at most 30 seconds as opposed to rebuilding the application over again for every change you implement in the application

```
npm start
```

### 12. Test the application in your browser
```
http://<network-ip>:3000
```

## CONGRATULATIONS. You have successfully setup the development environment of dekart.
---
## E. Setup Protocol Buffer Compiler (Optional)
### 1. Install protoc compiler

*IMPORTANT* Make sure you are outside dekart working directory
```
curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v3.14.0/protoc-3.14.0-linux-x86_64.zip
```
### 2. Unzip package to /usr/local
```
unzip -o protoc-3.14.0-linux-x86_64.zip -d /usr/local bin/protoc
unzip -o protoc-3.14.0-linux-x86_64.zip -d /usr/local 'include/*'
rm -f protoc-3.14.0-linux-x86_64.zip
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