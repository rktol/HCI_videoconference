const Peer = window.Peer;

(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const createPeer = document.getElementById('js-create-peer');
  const methodChange = document.getElementById('js-method-change');
  const joinTrigger = document.getElementById('js-join-trigger');
  const leaveTrigger = document.getElementById('js-leave-trigger');
  const remoteVideos = document.getElementById('js-remote-streams');
  const peer_Id = document.getElementById('js-peer-id');
  const roomId = document.getElementById('js-room-id');
  const roomMode = document.getElementById('js-room-mode');
  const localText = document.getElementById('js-local-text');
  const sendTrigger = document.getElementById('js-send-trigger');
  const messages = document.getElementById('js-messages');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');

  meta.innerText = `
    UA: ${navigator.userAgent}
    SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
  `.trim();

  const getRoomModeByHash = () => (location.hash === '#sfu' ? 'sfu' : 'mesh');

  roomMode.textContent = getRoomModeByHash();
  window.addEventListener(
    'hashchange',
    () => (roomMode.textContent = getRoomModeByHash())
  );

  const localStream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

  // Render local stream
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);


  createPeer.addEventListener('click', () => {

    //eslint-disable-next-line require-atomic-updates
    const peer = (window.peer = new Peer(peer_Id.value,{
      key: window.__SKYWAY_KEY__,
      debug: 3,
    }));

    peer.on('open',()=>{
      console.log(peer.id);
    });


    localVideo.setAttribute('class','stream'+peer_Id.value);
    peer.on('error', console.error);
  });

  methodChange.addEventListener('click',() => {
    localVideo.className = 'stream'+peer.id;
    switch(peer.id){
      case '1':
        remote2 = remoteVideos.querySelector(`[data-peer-id="2"]`);
        remote2.className = "local1_stream2";
        remote3 = remoteVideos.querySelector(`[data-peer-id="3"]`);
        remote3.className = "local1_stream3";
        break;
      case '2':
        remote2 = remoteVideos.querySelector(`[data-peer-id="3"]`);
        remote2.className = "local2_stream3";
        remote3 = remoteVideos.querySelector(`[data-peer-id="1"]`);
        remote3.className = "local2_stream1";
        break;
      case '3':
        remote2 = remoteVideos.querySelector(`[data-peer-id="1"]`);
        remote2.className = "local3_stream1";
        remote3 = remoteVideos.querySelector(`[data-peer-id="2"]`);
        remote3.className = "local3_stream2";
        break;
    }
  })


  // Register join handler
  joinTrigger.addEventListener('click', () => {
    // Note that you need to ensure the peer has connected to signaling server
    // before using methods of peer instance.

    if (!peer.open) {
      return;
    }


    const room = peer.joinRoom(roomId.value, {
      mode: getRoomModeByHash(),
      stream: localStream,
    });

    room.once('open', () => {
      messages.textContent += '=== You joined ===\n';
    });
    room.on('peerJoin', peerId => {
      messages.textContent += `=== ${peerId} joined ===\n`;
    });

    // Render remote stream for new peer join in the room
    room.on('stream', async stream => {
      const newVideo = document.createElement('video');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      // mark peerId to find it later at peerLeave event
      newVideo.setAttribute('data-peer-id', stream.peerId);
      newVideo.setAttribute('class','local'+peer.id+'_stream'+stream.peerId+'_0');
      remoteVideos.append(newVideo);
      await newVideo.play().catch(console.error);
    });

    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      // messages.textContent += `${src}: ${data}\n`;
      });

    // for closing room members
    room.on('peerLeave', peerId => {
      const remoteVideo = remoteVideos.querySelector(
        `[data-peer-id="${peerId}"]`
      );
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
      remoteVideo.remove();

      messages.textContent += `=== ${peerId} left ===\n`;
    });

    // for closing myself
    room.once('close', () => {
      sendTrigger.removeEventListener('click', onClickSend);
      messages.textContent += '== You left ===\n';
      Array.from(remoteVideos.children).forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
        remoteVideo.remove();
      });
    });

    sendTrigger.addEventListener('click', onClickSend);
    leaveTrigger.addEventListener('click', () => room.close(), { once: true });

    function onClickSend() {
      // Send message to all of the peers in the room via websocket
      room.send(localText.value);

      messages.textContent += `${peer.id}: ${localText.value}\n`;
      localText.value = '';
    }
  });
})();
