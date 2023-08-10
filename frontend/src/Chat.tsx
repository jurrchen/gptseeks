import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
} from "@chatscope/chat-ui-kit-react";
import { MessageDirection } from "@chatscope/chat-ui-kit-react/src/types/unions";
import { useState } from "react";
import { Spinner } from "react-bootstrap";
import { AppMsg } from "./lib/types";

// send this shit direct to open AI
// how do we maintain state?


type Message = {
  message: string,
  direction: MessageDirection,
  sender?: string
};

export default function Chat(props: {
  messages: AppMsg[],
  onMessage: (m: string) => void
}) {

  const [loading] = useState(false)

  return (
    <div style={{height: '100vh', width: '300px'}}>
      <MainContainer>
        <ChatContainer>
          <MessageList>
            {
              props.messages.map(({id, sender, message, creation}) => (
                <Message
                  key={id}
                  model={{
                    type: "custom",
                    direction: (sender === "bot") ? "incoming" : "outgoing",
                    position: "single",
                    sender,
                  }}
                >
                  { sender && <Message.Header 
                    sender={sender}
                    sentTime={new Date(creation).toLocaleTimeString()}
                  />}
                  <Message.CustomContent>
                    <div><b>{message}</b></div>
                  </Message.CustomContent>
                </Message>
              ))

            }
            {loading && <Message
              model={{
                type: "custom",
                direction: 'incoming',
                position: "single",
              }}
            >
              <Message.CustomContent>
                <Spinner />
              </Message.CustomContent>
            </Message>}
          </MessageList>
          <MessageInput             
            placeholder="Type message here" 
            disabled={loading}            
            onSend={(i, t) => {
              props.onMessage(t)
            }}
          />
        </ChatContainer>
      </MainContainer>
    </div>
  )
}
