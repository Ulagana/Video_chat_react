import React, { useState, useRef, useEffect } from 'react';

function ChatBox({ messages, sendMessage, username }) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="card position-fixed bottom-0 end-0 m-3" style={{ width: '300px', zIndex: 1000 }}>
      <div className="card-header">Chat</div>
      <div className="card-body" style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {messages.map((msg, index) => (
          <div key={index} className={`mb-2 ${msg.username === username ? 'text-end' : 'text-start'}`}>
            <strong>{msg.username}:</strong> {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="card-footer">
        <form onSubmit={handleSendMessage}>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChatBox;
