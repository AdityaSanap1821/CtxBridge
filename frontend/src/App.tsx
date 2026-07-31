import { useState } from 'react'

import './App.css'
import { ChatView } from './chat/ChatView'
import { JoinScreen } from './chat/JoinScreen'
import { IdentityContext, loadIdentity, saveIdentity } from './state/identity'
import type { Identity } from './state/identity'

function App() {
  const [identity, setIdentity] = useState<Identity | null>(() => loadIdentity())

  function join(next: Identity) {
    saveIdentity(next)
    setIdentity(next)
  }

  if (!identity) {
    return <JoinScreen onJoin={join} />
  }

  return (
    <IdentityContext.Provider value={identity}>
      <ChatView identity={identity} />
    </IdentityContext.Provider>
  )
}

export default App
