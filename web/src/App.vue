<script setup>
import { computed, ref } from 'vue'
import MarkdownIt from 'markdown-it'

const resume = ref('')
const result = ref('')
const loading = ref(false)
const error = ref('')
const apiBaseUrl = (import.meta.env.DEV
  ? '/api'
  : import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

function renderMarkdown(text) {
  return md.render(text || '')
}

const streamText = ref('')

const sampleResume = `前端开发工程师 / 3 年经验
- 熟悉 Vue 3、Vuex、Pinia、Element Plus
- 具备 React、TypeScript、Vite 的开发经验
- 参与过电商后台、运营活动页和中后台管理系统项目
- 擅长接口联调、性能优化、组件封装和代码规范治理`

function fillSample() {
  resume.value = sampleResume
}

function parseAnalysisContent(raw) {
  if (!raw) return []

  let content = ''
  if (typeof raw === 'string') {
    content = raw
  } else if (raw?.choices?.[0]?.message?.content) {
    content = raw.choices[0].message.content
  } else if (raw?.data?.choices?.[0]?.message?.content) {
    content = raw.data.choices[0].message.content
  } else if (raw?.content) {
    content = raw.content
  } else if (raw?.message?.content) {
    content = raw.message.content
  } else {
    content = JSON.stringify(raw, null, 2)
  }

  const sections = []
  const lines = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  let current = null

  lines.forEach((line) => {
    const headingMatch = line.match(/^([1-9])[\.\s：:]*\s*(.+)$/)
    if (headingMatch) {
      if (current) sections.push(current)
      current = {
        title: headingMatch[2].replace(/^['"“【】\s]+|['"”\s]+$/g, ''),
        body: ''
      }
      return
    }

    if (current) {
      current.body += `${current.body ? '\n' : ''}${line}`
    }
  })

  if (current) sections.push(current)

  return sections.length
    ? sections
    : [{ title: '分析结果', body: content }]
}

const analysisSections = computed(() => parseAnalysisContent(result.value))

async function analyze() {
  if (!resume.value.trim()) {
    error.value = '请输入简历内容后再开始分析。'
    return
  }

  loading.value = true
  error.value = ''
  result.value = ''
  streamText.value = ''

  try {
    const res = await fetch(`${apiBaseUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ resume: resume.value })
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data?.error?.message || data?.error || '分析失败，请稍后重试。')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let done = false

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (value) {
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n\n')
        lines.forEach((line) => {
          if (!line.startsWith('data:')) return
          const payload = line.replace(/^data:\s*/, '').trim()
          if (!payload || payload === '[DONE]') return
          try {
            const parsed = JSON.parse(payload)
            if (parsed.content) {
              streamText.value += parsed.content
              result.value = streamText.value
            }
          } catch (e) {
            // ignore malformed payloads
          }
        })
      }
    }
  } catch (e) {
    error.value = e.message || '分析失败，请稍后重试。'
    result.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-shell">
    <section class="hero-card">
      <div class="hero-copy">
        <p class="eyebrow">AI 简历分析助手666</p>
        <h1>让你的简历更有说服力</h1>
        <p class="intro">
          把简历内容粘贴进来，AI 会从技术优势、短板与提升建议三个维度，给出更适合求职场景的反馈。
        </p>
        <div class="hero-actions">
          <button class="primary-btn" :disabled="loading" @click="analyze">
            {{ loading ? '分析中...' : '开始分析' }}
          </button>
          <button class="secondary-btn" @click="fillSample">查看示例</button>
        </div>
      </div>

      <div class="hero-panel">
        <div class="chip">⚡ 结构化分析</div>
        <div class="chip">🎯 聚焦岗位匹配</div>
        <div class="chip">💡 可执行优化建议</div>
      </div>
    </section>

    <section class="workspace">
      <div class="editor-card">
        <div class="card-header">
          <h2>简历内容</h2>
          <span>支持粘贴完整简历或项目经历</span>
        </div>
        <textarea v-model="resume" placeholder="例如：3 年前端经验，熟悉 Vue 3、TypeScript、Node.js..." />
      </div>

      <div class="result-card">
        <div class="card-header">
          <h2>分析结果</h2>
          <span>{{ loading ? '生成中...' : '基于 AI 建议' }}</span>
        </div>

        <div v-if="loading && !streamText" class="loading-state">正在生成专业分析...</div>
        <div v-else-if="error" class="error-state">{{ error }}</div>
        <div v-else-if="analysisSections.length" class="result-list">
          <article v-for="(item, index) in analysisSections" :key="item.title + index" class="result-item">
            <h3>{{ item.title }}</h3>
            <div class="markdown-body" v-html="renderMarkdown(item.body)" />
          </article>
        </div>
        <div v-else class="empty-state">输入内容后即可看到分析结果。</div>
      </div>
    </section>
  </div>
</template>