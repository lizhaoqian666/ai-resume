const express = require('express')
const axios = require('axios')
const cors = require('cors')
require('dotenv').config()

if (!process.env.XIAOMI_API_KEY) {
    console.warn('XIAOMI_API_KEY is missing. Set it in server/.env for local use or environment variables in production.')
}

const app = express()
app.use(cors())
app.use(express.json())
const port = Number(process.env.PORT || 3000)

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        service: 'ai-resume-server'
    })
})

// Compatibility route: some Nginx proxy_pass settings strip /api prefix.
app.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'ai-resume-server'
    })
})

async function analyzeResume(req, res) {
    const resume = req.body.resume
    if (!resume) {
        return res.status(400).json({
            error: 'resume is required'
        })
    }

    res.setHeader('Content-Type', 'text/event-stream;charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    try {
        const response = await axios.post(
            'https://token-plan-cn.xiaomimimo.com/v1/chat/completions',
            {
                model: 'mimo-v2.5-pro',
                stream: true,
                messages: [
                    {
                        role: 'user',
                        content:
                            `
你是一名高级前端技术专家。

请分析下面简历：

${resume}

请严格使用 Markdown 格式输出：

# 简历分析

## 技术优势

- xxx

## 技术不足

- xxx

## 提升建议

- xxx

不要输出JSON，只输出Markdown文本。
`
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.XIAOMI_API_KEY}`
                },
                responseType: 'stream'
            }
        )

        const stream = response.data
        let buffer = ''

        stream.on('data', (chunk) => {
            buffer += chunk.toString('utf8')
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            lines.forEach((line) => {
                if (!line.trim()) return
                if (!line.startsWith('data:')) return

                const payload = line.slice(5).trim()
                if (payload === '[DONE]') {
                    res.write(`data: [DONE]\n\n`)
                    return
                }

                try {
                    const parsed = JSON.parse(payload)
                    const content = parsed?.choices?.[0]?.delta?.content || ''
                    if (content) {
                        res.write(`data: ${JSON.stringify({ content })}\n\n`)
                    }
                } catch (e) {
                    // ignore malformed payloads
                }
            })
        })

        stream.on('end', () => {
            if (buffer.trim()) {
                const payload = buffer.trim()
                if (payload.startsWith('data:')) {
                    const value = payload.slice(5).trim()
                    if (value !== '[DONE]') {
                        try {
                            const parsed = JSON.parse(value)
                            const content = parsed?.choices?.[0]?.delta?.content || ''
                            if (content) {
                                res.write(`data: ${JSON.stringify({ content })}\n\n`)
                            }
                        } catch (e) {
                            // ignore malformed payloads
                        }
                    }
                }
            }
            res.write(`data: [DONE]\n\n`)
            res.end()
        })

        stream.on('error', (err) => {
            console.log(err)
            res.write(`event: error\ndata: ${JSON.stringify({ error: err.message || 'stream error' })}\n\n`)
            res.end()
        })
    } catch (e) {
        console.log(e)
        res.write(`event: error\ndata: ${JSON.stringify({ error: e.message || 'stream error' })}\n\n`)
        res.end()
    }
}

app.post('/api/analyze', analyzeResume)
app.post('/analyze', analyzeResume)

app.listen(port, () => {
    console.log(`server running on ${port}`)
})