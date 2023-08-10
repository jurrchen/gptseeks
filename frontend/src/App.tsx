
import 'bootstrap/dist/css/bootstrap.min.css';
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";

import './App.css'

import Chat from "./Chat";
import { gql, useMutation, useQuery } from '@apollo/client';
import { useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { AppMsg } from './lib/types';



const ADD_MESSAGE = gql`
  mutation SendMessage($message: String!) {
    sendMessage(message: {
      message: $message
    }) {
      message
    }
  }
`

const CLEAR_ALL = gql`
  mutation ClearAll {
    clearAll
  }
`

const MESSAGES_SUBSCRIPTION = gql`
  subscription {
    newMessage {
      id
      message
      sender
      creation
    }
  }
`;

const MESSAGES_QUERY = gql`
  query AllMessages {
    messages {
      id
      message
      sender
      creation
    }
  }
`

function App() {

  const { subscribeToMore, data } = useQuery(MESSAGES_QUERY);

  const [mutateFunction] = useMutation(ADD_MESSAGE);

  const [clearFunction] = useMutation(CLEAR_ALL, {refetchQueries: [{ query: MESSAGES_QUERY }]});

  const onMessage = async (message: string) => {
    await mutateFunction({
      variables: {
        message
      }
    })
  }

  useEffect(() => {
    subscribeToMore({
      document: MESSAGES_SUBSCRIPTION,
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;

        // TODO: extremely inefficient, but just discard messages that are already in the list
        // This is because of double subscription issue in Apollo Client
        const mSet = new Set(prev.messages.map((m: AppMsg) => (m.id)));
        if(mSet.has(subscriptionData.data.newMessage.id)) return prev;

        return {
          messages: [
            ...prev.messages,
            subscriptionData.data.newMessage
          ]
        };
      }
    });
  }, [subscribeToMore]);

  return (
    <div className="container">
      <div className="left-panel">
        <Button onClick={() => (clearFunction())}>Clear</Button>
      </div>
      <div className="right-panel">
        <Chat
          messages={data?.messages || []}
          onMessage={onMessage}
        />
      </div>
    </div>
  )
}

export default App
