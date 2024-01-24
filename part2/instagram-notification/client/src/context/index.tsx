import { createContext, useReducer, ReactNode, Dispatch } from "react";
import { AUTH_INFO } from "./action";

// Action 인터페이스 생성
interface Action {
  // type 은 `AUTH_INFO`
  type: typeof AUTH_INFO;
  // payload string
  payload: string;
}

interface ContextState {
  // initState
  state: typeof initialState;
  dispatch: Dispatch<Action>;
}

// state 객체
const initialState = {
  userName: "",
};

// reducer 생성
//
// useReducer 에서 사용될 reducer 함수
// 첫번째 인자는 state
// 두번째 인자는 action 값을 받는다.
// 받은 action.type 에 따라 state 값을 변경한다.
// 변경할 값은 action.payload 에 저장하여 내보낸다
const reducer = (state = initialState, action: Action) => {
  switch (action.type) {
    case AUTH_INFO:
      return {
        ...state,
        userName: action.payload,
      };
    default:
      return state;
  }
};

// Context 생성
//
// 여기에 들어가는 객체는 `default value` 를 지정한다
// `default value` 는 적절한 `Provider` 를 찾지 못할때
// 반환하는 값이다.
// 여기서는 빈 객체로 한다
export const Context = createContext({} as ContextState);

// StoreProvider JSX 생성
// props 로 children 을 받아서 처리한다
export const StoreProvider = ({ children }: { children: ReactNode }) => {
  // useReducer 를 사용하여 reducer, initialState 를 전달
  // 반환값으로 `state`, `dispatch` 를 전달받는다
  const [state, dispatch] = useReducer(reducer, initialState);
  // Context.Provider 에 전달할 store 객체
  const value = { state, dispatch };
  // Context.Provider 에서 사용할 store 를 사용
  // props 로 받은 children JSX 는 이 store 값 사용가능
  return <Context.Provider value={value}>{children}</Context.Provider>;
};
