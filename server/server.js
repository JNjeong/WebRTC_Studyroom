import express from "express"
import http from "http"
import {Server} from "socket.io"
import path from "path"
import {ProfanityFilter} from "korean-profanity-filter"

const app = express()

function run(){
    console.log(ProfanityFilter.check("씨발"))
}
run()

app.listen(3000, ()=>{
    console.log('running...')
})




















const PORT = 3000
server.listem(PORT, ()=>{
    console.log('server running')
})