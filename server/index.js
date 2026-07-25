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
app.post('/api/analyze', async (req, res) => {
    const resume = req.body.resume
    try {
        const result = await axios.post(
            'https://token-plan-cn.xiaomimimo.com/v1/chat/completions',
            {
                model: 'mimo-v2.5-pro',
                messages: [
                    {
                        role: 'user',
                        content:
                            `
            你是一名高级前端技术专家。
            请分析下面简历：
            ${resume}
            输出：
            1.技术优势
            2.不足
            3.提升建议
            `
                    }
                ]
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${process.env.XIAOMI_API_KEY}`
                }
            }
        )
        res.json(result.data)
    } catch (e) {
        console.log(e)
        res.status(500).json({
            error:e.response?.data || e.message
        })
    }
})
app.listen(3000, () => {
    console.log('server running')
})