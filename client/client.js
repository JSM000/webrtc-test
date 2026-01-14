const socket = io();

const joinBtn = document.getElementById('joinBtn');
const roomInput = document.getElementById('room');
const setupDiv = document.getElementById('setup');
const chatContainer = document.getElementById('chat-container');
const chatArea = document.getElementById('chat-area');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');

let rtcPeerConnection;
let dataChannel;
let room;

let iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

async function fetchConfig() {
    try {
        const response = await fetch('/config');
        const data = await response.json();
        if (data.iceServers) {
            iceServers = { iceServers: data.iceServers };
            console.log('Loaded ICE servers:', iceServers);
        }
    } catch (error) {
        console.error('Failed to fetch config:', error);
    }
}

fetchConfig();

joinBtn.onclick = () => {
    room = roomInput.value;
    if (room) {
        socket.emit('join', room);
        setupDiv.style.display = 'none';
        chatContainer.style.display = 'block';
    }
};

sendBtn.onclick = sendMessage;
msgInput.onkeypress = (e) => {
    if (e.key === 'Enter') sendMessage();
};

function sendMessage() {
    const message = msgInput.value;
    if (message && dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(message);
        appendMessage(message, 'my-message');
        msgInput.value = '';
    }
}

function appendMessage(msg, className) {
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.textContent = msg;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
}

socket.on('user-joined', async (userId) => {
    console.log('User joined, creating offer');
    const pc = createPeerConnection(userId);

    // Create Data Channel
    dataChannel = pc.createDataChannel("chat");
    setupDataChannel(dataChannel);

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', {
            type: 'offer',
            sdp: offer,
            target: userId,
            sender: socket.id
        });
    } catch (error) {
        console.error('Error creating offer:', error);
    }
});

socket.on('offer', async (payload) => {
    console.log('Offer received');
    const pc = createPeerConnection(payload.sender);

    pc.ondatachannel = (event) => {
        console.log('Data channel received');
        dataChannel = event.channel;
        setupDataChannel(dataChannel);
    };

    try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', {
            type: 'answer',
            sdp: answer,
            target: payload.sender,
            sender: socket.id
        });
    } catch (error) {
        console.error('Error handling offer:', error);
    }
});

socket.on('answer', async (payload) => {
    console.log('Answer received');
    try {
        await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    } catch (error) {
        console.error('Error handling answer:', error);
    }
});

socket.on('ice-candidate', async (candidate) => {
    try {
        if (rtcPeerConnection) {
            await rtcPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
});

function createPeerConnection(targetId) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);

    rtcPeerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                target: targetId,
                candidate: event.candidate
            });
        }
    };
    return rtcPeerConnection;
}

function setupDataChannel(channel) {
    channel.onopen = () => {
        console.log('Data channel is open');
        appendMessage('--- Connected ---', 'system-message');
    };
    channel.onmessage = (event) => {
        console.log('Message received:', event.data);
        appendMessage(event.data, 'peer-message');
    };
}
