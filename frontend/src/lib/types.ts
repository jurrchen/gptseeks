export type AppMsg = {
  message: string;
  sender: 'user' | 'bot';
  creation: string;
  id: string;
}