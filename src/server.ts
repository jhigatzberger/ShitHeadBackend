import {createServer} from "http"
import express from "express"
import {WebSocket} from "ws"
import { Game } from "./game"

const port = 8080
const server = createServer(express)
const wss = new WebSocket.Server({server})
const game = new Game(["0", "1"])

wss.on('connection', (ws)=>{
    ws.on('message', (data)=>{
        wss.clients.forEach((client)=>{
            if(client.readyState === WebSocket.OPEN){
                game.play(JSON.parse(data.toString()))
            }
        })
    })
})

server.listen(port, ()=>{
    console.log('server is listening on ' + port);
})