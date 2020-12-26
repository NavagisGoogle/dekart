import { combineReducers } from 'redux'
import keplerGlReducer from 'kepler.gl/reducers'
import { ActionTypes as KeplerActionTypes } from 'kepler.gl/actions'
import { downloadJobResults, openReport, reportUpdate, runQuery, saveMapConfig, updateQuery } from './actions'
import { Query } from '../proto/dekart_pb'

const customKeplerGlReducer = keplerGlReducer.initialState({
  uiState: {
    currentModal: null
    // activeSidePanel: null
  }
})

function keplerGl (state, action) {
  // console.log('keplerGl', state)
  // console.log('keplerGl', action)
  return customKeplerGlReducer(state, action)
}

function report (state = null, action) {
  switch (action.type) {
    case openReport.name:
      return null
    case reportUpdate.name:
      return action.report
    default:
      return state
  }
}

function queries (state = [], action) {
  switch (action.type) {
    case openReport.name:
      return []
    case reportUpdate.name:
      return action.queriesList
    default:
      return state
  }
}

const defaultReportStatus = {
  dataAdded: false,
  canSave: false
}
function reportStatus (state = defaultReportStatus, action) {
  switch (action.type) {
    case saveMapConfig.name:
      return {
        ...state,
        canSave: false
      }
    case reportUpdate.name:
      return {
        ...state,
        canSave: true
      }
    case openReport.name:
      return defaultReportStatus
    case KeplerActionTypes.ADD_DATA_TO_MAP:
      return {
        ...state,
        dataAdded: true
      }
    default:
      return state
  }
}
function queryStatus (state = {}, action) {
  let queryId
  switch (action.type) {
    case KeplerActionTypes.ADD_DATA_TO_MAP:
      if (action.payload.datasets && action.payload.datasets.info) {
        queryId = action.payload.datasets.info.id
        return {
          ...state,
          [queryId]: {
            ...state[queryId],
            downloadingResults: false
          }
        }
      }
      return state
    case downloadJobResults.name:
      return {
        ...state,
        [action.query.id]: {
          ...state[action.query.id],
          downloadingResults: true
        }
      }

    case runQuery.name:
    case updateQuery.name:
      return {
        ...state,
        [action.queryId]: {
          ...state[action.queryId],
          canRun: false
        }
      }
    case reportUpdate.name:
      return action.queriesList.reduce(function (queryStatus, query) {
        queryStatus[query.id] = {
          canRun: [Query.JobStatus.JOB_STATUS_UNSPECIFIED, Query.JobStatus.JOB_STATUS_DONE].includes(query.jobStatus),
          downloadingResults: false
        }
        return queryStatus
      }, {})
    default:
      return state
  }
}

export default combineReducers({
  keplerGl,
  report,
  queries,
  queryStatus,
  reportStatus
})