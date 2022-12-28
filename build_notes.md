## Steps on how to build the project in App Engine for Internal Testing

## A. Populate the app.yaml file
### 1. Copy the app.yaml.example into app.yaml file
```
cp app.yaml.example app.yaml
```

### 2. You may change the 'service' name. But mostly you need to enter the fields for the environment variables. Also, use the internal host ip for the Postgres DB so you wouldn't need to whitelist App Engine's IP every deploy.
### You also need to input the correct PROJECT_ID and the DB_INSTANCE_NAME.
```
beta_settings:
  # see https://cloud.google.com/sql/docs/mysql/connect-app-engine-flexible
   cloud_sql_instances: "${PROJECT_ID}:europe-west1:${DB_INSTANCE_NAME}=tcp:5432"
```
---
## B. Make sure you have gcloud cli setup. [Here](https://cloud.google.com/sdk/docs/install) are the steps.
---
## C. Build the project
### 1. Make sure the `.env.development` file points to localhost:8080 and the urls in `src/client/reducers.js` have omitted host and port.
```
const customKeplerGlReducer = keplerGlReducer.initialState({
  mapStyle: {
    mapStyles: {
      streets2d: {
        id: 'streets2d',
        label: 'Street',
        url: '/api/v1/style/gmp-streets2d.json',
        icon: '/gmp-2d-streets-z0.png'
      },
      satellite: {
        id: 'satellite',
        label: 'Satellite',
        url: '/api/v1/style/gmp-satellite.json',
        icon: '/gmp-satellite-z0.png'
      },
      terrain: {
        id: 'terrain',
        label: 'Terrain',
        url: '/api/v1/style/gmp-terrain.json',
        icon: '/gmp-terrain-z0.png'
      },
      hybrid: {
        id: 'hybrid',
        label: 'Hybrid',
        url: '/api/v1/style/gmp-hybrid.json',
        icon: '/gmp-hybrid-z0.png'
      },
      light: {
        id: 'light',
        label: 'Light',
        url: '/api/v1/style/gmp-light.json',
        icon: '/gmp-light-z0.png'
      },
      dark: {
        id: 'dark',
        label: 'Dark',
        url: '/api/v1/style/gmp-dark.json',
        icon: '/gmp-dark-z0.png'
      }
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

### 2. We need to generate the build files optimized for production. this can be done using the command:
```
npm run build
```

Note: If you encounter a heap-memory related error, you may need to adjust the memory allocation for npm
```
export NODE_OPTIONS="--max-old-space-size=8192"
```

### 3. (This is a temporary workaround) Edit `src/server/dekart/googlemaps.go` around the function `ServeMapStyle`
Comment out this whole code block:
```
styleJsonFile, err := os.Open("src/server/styles/style-template.json")
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
```

Then, uncomment the line below:
```
// jsonBytes := []byte(`{"version":8,"sources":{"raster-tiles":{"type":"raster","tiles":["https://www.googleapis.com/tile/v1/tiles/{z}/{x}/{y}"],"tileSize":256,"attribution":"Map tiles by <a target=\"_top\" rel=\"noopener\" href=\"https://maps.google.com\">Google</a>"}},"layers":[{"id":"simple-tiles","type":"raster","source":"raster-tiles","minzoom":0,"maxzoom":22}]}`)
```

The reason for this is that in App Engine VM, the files will be stored a little differently than when we have the local environment. The Application will then fail to read from `src/server/styles/style-template.json`. This will be resolved soon after all the other essential requirements are met.

---
## D. Begin deployment steps.
### 1. (Only for initial deployment) Set the timeout value for gcloud app cloud build to 3600
```
gcloud config set app/cloud_build_timeout 3600
```

### 2. Deploy to app engine
```
gcloud app deploy --project {project_id} --version {version_name} --no-promote
```
Replace {project_id} with the appropriate project id and {version_name} with the appropriate version name. 
