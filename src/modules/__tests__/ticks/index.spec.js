import configureMockStore from "redux-mock-store"
import io from "socket.io-client"
import thunk from "redux-thunk"
import ticks, {
  groupByFiveMinutes,
  groupByOneDay,
  getMode,
  getGroupTime,
  getTimeFormat,
  getLastTickFromAPI,
  getTicks,
  fetchTicks
} from "../../ticks"

import * as utils from "../../ticks/utils"

const mockOnFn = jest.fn()
jest.mock("socket.io-client", function() {
  return () => ({ on: mockOnFn })
})

const middlewares = [thunk]
const mockStore = configureMockStore(middlewares)

const defaultTicksState = {
  data: [],
  groupedBy: 1000 * 60 * 5,
  ticksCount: 12,
  timeFormat: "HH:mm",
  mode: "MODE_FIVE_MINUTES"
}

describe("ticks actions", () => {
  it("should create an action to group elements  5 minutes", () => {
    const expectedAction = {
      type: "ticks/GROUP_BY",
      groupedBy: 1000 * 60 * 5,
      ticksCount: 12,
      timeFormat: "HH:mm",
      mode: "MODE_FIVE_MINUTES"
    }
    expect(groupByFiveMinutes()).toEqual(expectedAction)
  })

  it("should create an action to group elements 1 hour", () => {
    const expectedAction = {
      type: "ticks/GROUP_BY",
      groupedBy: 1000 * 60 * 60 * 24,
      ticksCount: 30,
      timeFormat: "D MMM",
      mode: "MODE_ONE_DAY"
    }
    expect(groupByOneDay()).toEqual(expectedAction)
  })

  it("should call socket.io", () => {
    const store = mockStore({})

    store.dispatch(fetchTicks())

    expect(mockOnFn).toHaveBeenCalledTimes(2)
  })
})

describe("ticks reducers", () => {
  it("should return initial state", () => {
    expect(ticks(undefined, {})).toEqual(defaultTicksState)
  })

  it("should handle GROUP_BY", () => {
    expect(ticks({ data: [1] }, groupByOneDay())).toEqual({
      data: [1],
      groupedBy: 1000 * 60 * 60 * 24,
      ticksCount: 30,
      timeFormat: "D MMM",
      mode: "MODE_ONE_DAY"
    })
  })

  it("should handle ADD_OLD_TICKS", () => {
    expect(
      ticks(
        { data: [] },
        {
          type: "ticks/ADD_OLD_TICKS",
          ticks: [2, 3]
        }
      )
    ).toEqual({
      data: [2, 3]
    })
  })

  it("should handle ADD_TICK", () => {
    expect(
      ticks(
        { data: [2, 3] },
        {
          type: "ticks/ADD_TICK",
          tick: 4
        }
      )
    ).toEqual({
      data: [2, 3, 4]
    })
  })
})

describe("ticks selectors", () => {
  let state = { ticks: { ...defaultTicksState } }
  let stateWithTicks = {
    ticks: {
      ...defaultTicksState,
      data: [
        {
          totalCallsRemoved: -2,
          totalCallsAdded: 1,
          timestamp: 3,
          segmentSize: 4
        },
        {
          totalCallsRemoved: -4,
          totalCallsAdded: 3,
          timestamp: 6,
          segmentSize: 1
        },
        {
          totalCallsRemoved: -6,
          totalCallsAdded: 7,
          timestamp: 8,
          segmentSize: 1
        }
      ]
    }
  }

  it("getMode should return mode", () => {
    expect(getMode(state)).toEqual("MODE_FIVE_MINUTES")
  })

  it("getGroupTime should return group time", () => {
    expect(getGroupTime(state)).toEqual(300000)
  })

  it("getTimeFormat should return time format", () => {
    expect(getTimeFormat(state)).toEqual("HH:mm")
  })

  it("getLastTickFromAPI should return undefined for initial state ", () => {
    expect(getLastTickFromAPI(state)).toEqual(undefined)
  })

  it("getLastTickFromAPI should return last ticks", () => {
    expect(getLastTickFromAPI(stateWithTicks)).toEqual({
      totalCallsRemoved: -6,
      totalCallsAdded: 7,
      timestamp: 8,
      segmentSize: 1
    })
  })

  it("getTicks shoul call functions from utils", () => {
    const now = Date.now()
    Date.now = jest.genMockFunction().mockReturnValue(now)

    utils.getTicksForChart = jest.fn()
    utils.getNearestRoundedTimeBy = jest.fn(() => now)

    getTicks(stateWithTicks)

    expect(utils.getTicksForChart).toHaveBeenCalledWith(
      stateWithTicks.ticks.data,
      now,
      300000,
      12
    )

    expect(utils.getNearestRoundedTimeBy).toHaveBeenCalledWith(
      now,
      state.ticks.groupedBy
    )
  })
})
