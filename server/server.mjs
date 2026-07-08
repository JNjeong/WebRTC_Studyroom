import expess from "express"
import http from "http"
import {Server} from "socket.io"
import path from "path"

const app = express()
const server = createServer(app)
const io = new Server(server)

// ES6 는 현재 디렉토리를 가져오는 속성값이 없으므로, 직접 설정
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.use(express.static(path.join(__dirname, "public")))


















const PORT = 3000
server.listem(PORT, ()=>{
    console.log('server running')
})