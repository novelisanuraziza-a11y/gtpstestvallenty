#include <napi.h>
#include <enet/enet.h>
#include <vector>
#include <string>
#include <stdlib.h>

// Bypassing Visual Studio 2022 UCRT linker error for obsolete MSVCRTD enet.lib
extern "C" {
    long (*__imp_strtol)(const char*, char**, int) = &strtol;
}

ENetHost* host = nullptr;

Napi::Value CreateHost(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber()) {
        Napi::TypeError::New(env, "Number expected for port, maxPeers, maxChannels").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (enet_initialize() != 0) {
        Napi::Error::New(env, "An error occurred while initializing ENet.").ThrowAsJavaScriptException();
        return env.Null();
    }

    int port = info[0].As<Napi::Number>().Int32Value();
    int maxPeers = info[1].As<Napi::Number>().Int32Value();
    int maxChannels = info[2].As<Napi::Number>().Int32Value();

    ENetAddress address;
    address.host = ENET_HOST_ANY;
    address.port = port;

    host = enet_host_create(&address, maxPeers, maxChannels, 0, 0);

    if (host == nullptr) {
        Napi::Error::New(env, "An error occurred while trying to create an ENet server host.").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    // Disable strict CRC32 to allow GT 5.15+ modified ENet packets
    host->checksum = nullptr;
    enet_host_compress_with_range_coder(host); 

    return Napi::Boolean::New(env, true);
}

Napi::Value PollEvents(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!host) {
        return env.Null();
    }

    ENetEvent event;
    int res = enet_host_service(host, &event, 0); // Non-blocking poll

    if (res > 0) {
        Napi::Object result = Napi::Object::New(env);

        switch (event.type) {
            case ENET_EVENT_TYPE_CONNECT: {
                result.Set("type", Napi::String::New(env, "connect"));
                result.Set("peerId", Napi::Number::New(env, (uintptr_t)event.peer)); // Need a way to reliably map ENetPeer* to an ID, its connectID could work or memory addr. Better yet, incomingPeerID.
                result.Set("connectID", Napi::Number::New(env, event.peer->connectID));

                char ip[256];
                enet_address_get_host_ip(&event.peer->address, ip, 256);
                result.Set("ip", Napi::String::New(env, ip));
                break;
            }
            case ENET_EVENT_TYPE_RECEIVE: {
                result.Set("type", Napi::String::New(env, "receive"));
                result.Set("peerId", Napi::Number::New(env, (uintptr_t)event.peer));
                result.Set("connectID", Napi::Number::New(env, event.peer->connectID));

                // Process Packet
                Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, (uint8_t*)event.packet->data, event.packet->dataLength);
                result.Set("data", buffer);
                result.Set("channelID", Napi::Number::New(env, event.channelID));

                enet_packet_destroy(event.packet);
                break;
            }
            case ENET_EVENT_TYPE_DISCONNECT: {
                result.Set("type", Napi::String::New(env, "disconnect"));
                result.Set("peerId", Napi::Number::New(env, (uintptr_t)event.peer));
                result.Set("connectID", Napi::Number::New(env, event.peer->connectID));
                break;
            }
            default:
                result.Set("type", Napi::String::New(env, "none"));
                break;
        }

        return result;
    }

    return env.Null();
}

Napi::Value SendPacket(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // Args: peerId (number ptr), Buffer data, flag (reliable or not)
    if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsBuffer() || !info[2].IsNumber()) {
        Napi::TypeError::New(env, "Expected peerId, Buffer, flag").ThrowAsJavaScriptException();
        return env.Null();
    }

    ENetPeer* peer = (ENetPeer*)(uintptr_t)info[0].As<Napi::Number>().Int64Value();
    Napi::Buffer<uint8_t> buffer = info[1].As<Napi::Buffer<uint8_t>>();
    int flag = info[2].As<Napi::Number>().Int32Value();

    ENetPacket* packet = enet_packet_create(buffer.Data(), buffer.Length(), flag);
    enet_peer_send(peer, 0, packet); // Sending on channel 0

    return Napi::Boolean::New(env, true);
}

Napi::Value DisconnectPeer(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsNumber()) return env.Null();

    ENetPeer* peer = (ENetPeer*)(uintptr_t)info[0].As<Napi::Number>().Int64Value();
    enet_peer_disconnect_later(peer, 0);

    return Napi::Boolean::New(env, true);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "createHost"), Napi::Function::New(env, CreateHost));
    exports.Set(Napi::String::New(env, "pollEvents"), Napi::Function::New(env, PollEvents));
    exports.Set(Napi::String::New(env, "sendPacket"), Napi::Function::New(env, SendPacket));
    exports.Set(Napi::String::New(env, "disconnectPeer"), Napi::Function::New(env, DisconnectPeer));
    return exports;
}

NODE_API_MODULE(enet_wrapper, Init)
