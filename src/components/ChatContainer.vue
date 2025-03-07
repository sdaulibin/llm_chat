<script setup>
import { ref, watch, onMounted, defineEmits } from 'vue';
import { setApiKey, sendChatMessage, handleStreamResponse, stopChatMessage, getSuggestedQuestions, feedbackMessage } from '../services/difyApi';
import MarkdownIt from 'markdown-it';

const props = defineProps({
  selectedHistory: {
    type: String,
    default: ''
  }
});

// 定义事件
const emit = defineEmits(['add-history']);

// Dify API密钥 - 已直接设置，无需用户输入
const API_KEY = ref('app-CVmaUK0HDbPgzocvGfjSjN4R');
// 当前会话ID
const conversationId = ref('');
// 当前消息ID，用于停止响应
const currentMessageId = ref('');
// 是否正在加载
const isLoading = ref(false);
// 是否显示API密钥输入框
const showApiKeyInput = ref(false);
// 建议问题列表
const suggestedQuestions = ref([]);

const messages = ref([
  {
    type: 'bot',
    content: '您好！我是您的智能办公助手。请先设置API密钥以开始对话。',
    messageId: null,
    feedback: null
  }
]);

const newMessage = ref('');

// 初始化Markdown解析器
const md = new MarkdownIt({
  html: true,        // 启用HTML标签
  breaks: true,      // 转换\n为<br>
  linkify: true,     // 自动将URL转换为链接
  typographer: true, // 启用一些语言中性的替换和引号美化
  highlight: function (str, lang) {
    // 增强代码高亮显示
    if (lang) {
      return `<pre class="language-${lang}"><code class="language-${lang}">${str}</code></pre>`;
    } 
    return `<pre><code>${str}</code></pre>`;
  }
});

// 设置API密钥
onMounted(() => {
  // API密钥已直接设置，无需从本地存储获取
  setApiKey(API_KEY.value);
  messages.value = [
    {
      type: 'bot',
      content: '您好！我是您的智能办公助手。请问有什么可以帮您？'
    }
  ];
});

// 监听历史记录选择
watch(() => props.selectedHistory, (newVal) => {
  if (newVal) {
    newMessage.value = newVal;
  }
});

// 保存API密钥
const saveApiKey = () => {
  if (!API_KEY.value.trim()) {
    alert('请输入有效的API密钥');
    return;
  }
  
  setApiKey(API_KEY.value);
  localStorage.setItem('dify_api_key', API_KEY.value);
  showApiKeyInput.value = false;
  messages.value = [
    {
      type: 'bot',
      content: '您好！我是您的智能办公助手。请问有什么可以帮您？'
    }
  ];
};

// 发送消息到Dify API
const sendToDify = async (query) => {
  isLoading.value = true;
  try {
    // 发送消息到Dify API
    const response = await sendChatMessage({
      query,
      inputs: {}, // 应用定义的变量值
      conversationId: conversationId.value,
      user: 'abc-123', // 使用文档中的用户标识
      streaming: true, // 使用流式响应
      files: [] // 可以在这里添加文件，格式为[{type, transfer_method, url}]
    });

    // 处理流式响应
    let fullResponse = '';
    await handleStreamResponse(response, {
      onMessage: (data) => {
        // 更新当前消息内容
        fullResponse += data.content;
        
        // 保存当前消息ID，用于停止响应
        if (data.messageId && !currentMessageId.value) {
          currentMessageId.value = data.messageId;
        }
        
        // 如果是第一次收到消息，创建新的机器人消息
        if (!messages.value.find(m => m.type === 'bot' && m.isLoading)) {
          messages.value.push({
            type: 'bot',
            content: fullResponse,
            isLoading: true,
            messageId: data.messageId,
            feedback: null
          });
        } else {
          // 更新现有的加载中消息
          const loadingMessage = messages.value.find(m => m.type === 'bot' && m.isLoading);
          if (loadingMessage) {
            loadingMessage.content = fullResponse;
            // 确保messageId被保存
            if (data.messageId && !loadingMessage.messageId) {
              loadingMessage.messageId = data.messageId;
            }
          }
        }

        // 保存会话ID
        if (data.conversationId && !conversationId.value) {
          conversationId.value = data.conversationId;
        }
      },
      onError: (error) => {
        console.error('流式响应错误:', error);
        messages.value.push({
          type: 'bot',
          content: '抱歉，处理您的请求时出现了错误。请稍后再试。',
          isError: true
        });
      },
      onEnd: (data) => {
        // 消息加载完成
        const loadingMessage = messages.value.find(m => m.type === 'bot' && m.isLoading);
        if (loadingMessage) {
          loadingMessage.isLoading = false;
        }
        isLoading.value = false;
        
        // 保存会话ID
        if (data.conversationId) {
          conversationId.value = data.conversationId;
        }
        
        // 获取下一轮建议问题列表
        if (data.messageId) {
          fetchSuggestedQuestions(data.messageId);
        }
      }
    });
  } catch (error) {
    console.error('发送消息失败:', error);
    messages.value.push({
      type: 'bot',
      content: '抱歉，发送消息时出现了错误。请检查网络连接或API密钥设置。',
      isError: true
    });
    isLoading.value = false;
  }
};

const sendMessage = () => {
  if (!newMessage.value.trim() || isLoading.value) return;
  
  // 添加用户消息
  messages.value.push({
    type: 'user',
    content: newMessage.value
  });
  
  const userQuestion = newMessage.value;
  newMessage.value = '';
  
  // 将问题添加到历史记录
  emit('add-history', userQuestion);
  
  // 检查API密钥是否已设置
  if (!API_KEY.value) {
    messages.value.push({
      type: 'bot',
      content: '请先设置Dify API密钥才能使用AI助手功能。',
      isError: true
    });
    return;
  }
  
  // 发送消息到Dify API
  sendToDify(userQuestion);
};

// 停止响应
const stopResponse = async () => {
  if (!currentMessageId.value || !isLoading.value) return;
  
  try {
    await stopChatMessage(currentMessageId.value, 'abc-123');
    isLoading.value = false;
    
    // 更新消息状态
    const loadingMessage = messages.value.find(m => m.type === 'bot' && m.isLoading);
    if (loadingMessage) {
      loadingMessage.isLoading = false;
      loadingMessage.content += '\n\n*响应已停止*';
    }
  } catch (error) {
    console.error('停止响应失败:', error);
  }
};

// 获取下一轮建议问题列表
const fetchSuggestedQuestions = async (messageId) => {
  try {
    const response = await getSuggestedQuestions(messageId, 'abc-123');
    console.log('建议问题API返回数据:', response);
    if (response && response.result === 'success' && response.data && Array.isArray(response.data)) {
      // 更新建议问题列表
      suggestedQuestions.value = response.data;
    } else if (response && response.suggested_questions && Array.isArray(response.suggested_questions)) {
      // 兼容原有格式
      suggestedQuestions.value = response.suggested_questions;
    } else {
      suggestedQuestions.value = [];
    }
  } catch (error) {
    console.error('获取建议问题失败:', error);
    suggestedQuestions.value = [];
  }
};

// 使用建议问题
const useSuggestedQuestion = (question) => {
  if (!question) return;
  
  // 设置问题到输入框
  newMessage.value = question;
  
  // 发送消息
  sendMessage();
  
  // 清空建议问题列表
  suggestedQuestions.value = [];
};

// 复制AI回答内容到剪贴板
const copyToClipboard = (content) => {
  // 创建一个临时元素来存放要复制的文本
  const tempElement = document.createElement('div');
  tempElement.innerHTML = content;
  
  // 获取纯文本内容（去除HTML标签）
  const textContent = tempElement.textContent || tempElement.innerText;
  
  // 使用Clipboard API复制内容
  navigator.clipboard.writeText(textContent)
    .then(() => {
      // 复制成功的反馈
      showCopySuccess();
    })
    .catch(err => {
      console.error('复制失败:', err);
      alert('复制失败，请重试');
    });
};

// 显示复制成功的反馈
const copySuccess = ref(null);
const showCopySuccess = () => {
  copySuccess.value = true;
  setTimeout(() => {
    copySuccess.value = null;
  }, 2000);
};

// 发送消息反馈（点赞/点踩）
const sendFeedback = async (messageId, rating) => {
  if (!messageId) return;
  
  try {
    // 查找当前消息
    const message = messages.value.find(m => m.messageId === messageId);
    if (!message) return;
    
    // 如果当前反馈与新反馈相同，则撤销反馈
    const newRating = message.feedback === rating ? null : rating;
    
    // 更新消息的反馈状态
    message.feedback = newRating;
    
    // 发送反馈到Dify API
    await feedbackMessage(messageId, newRating, 'abc-123');
    
  } catch (error) {
    console.error('发送反馈失败:', error);
    // 恢复原始反馈状态
    const message = messages.value.find(m => m.messageId === messageId);
    if (message) {
      message.feedback = message.feedback === rating ? null : message.feedback;
    }
  }
};
</script>

<template>
  <div class="chat-container">
    <!-- API密钥已预设，不再显示设置界面 -->
    
    <!-- 聊天消息列表 -->
    <div v-for="(message, index) in messages" :key="index" class="message" :class="{ user: message.type === 'user', error: message.isError }">
      <div class="avatar">
        <i class="fas" :class="message.type === 'user' ? 'fa-user' : 'fa-robot'" style="color: #64748b;"></i>
      </div>
      <div class="content-wrapper">
        <div class="content" v-html="message.type === 'user' ? message.content.replace(/\n/g, '<br>') : md.render(message.content)">
        </div>
        <!-- 只为AI回答添加复制按钮，并且不是初始化消息 -->
        <button v-if="message.type === 'bot' && index > 0" class="copy-button position-top-right" @click="copyToClipboard(md.render(message.content))" :class="{ 'success': copySuccess === true }">
          <i class="fas" :class="copySuccess === true ? 'fa-check' : 'fa-copy'"></i>
          <span v-if="copySuccess === true">已复制</span>
          <span v-else>复制</span>
        </button>
        <!-- 为AI回答添加点赞按钮 -->
        <div v-if="message.type === 'bot' && message.messageId && index > 0" class="feedback-buttons">
          <button 
            class="feedback-button" 
            :class="{ 'active': message.feedback === 'like' }" 
            @click="sendFeedback(message.messageId, 'like')"
          >
            <i class="fas fa-thumbs-up"></i>
            <span>{{ message.feedback === 'like' ? '已点赞' : '点赞' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="input-container">
    <!-- 建议问题列表 -->
    <div v-if="suggestedQuestions.length > 0" class="suggested-questions">
      <div class="suggested-title">您可能想问：</div>
      <div class="question-list">
        <div 
          v-for="(question, index) in suggestedQuestions" 
          :key="index" 
          class="question-item"
          @click="useSuggestedQuestion(question)"
        >
          {{ question }}
        </div>
      </div>
    </div>
    
    <div class="input-box">
      <textarea v-model="newMessage" placeholder="请输入您的问题..." @keyup.enter.ctrl="sendMessage"></textarea>
      <button v-if="!isLoading" @click="sendMessage" :disabled="showApiKeyInput">
        <i class="fas fa-paper-plane"></i>
        发送
      </button>
      <button v-else class="stop-button" @click="stopResponse">
        <i class="fas fa-stop"></i>
        停止
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.input-container {
  padding: 20px;
  border-top: 1px solid #e6e8eb;
  background: white;
}

.input-box {
  display: flex;
  gap: 12px;
}

textarea {
  flex: 1;
  height: 80px;
  padding: 12px;
  border: 1px solid #e6e8eb;
  border-radius: 8px;
  resize: none;
  font-size: 14px;
}

button {
  padding: 12px 24px;
  background: #1e3a8a;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.3s ease;
}

button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background: #1e40af;
}

.message {
  margin-bottom: 24px;
  display: flex;
  gap: 16px;
}

.message .avatar {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-wrapper {
  flex: 1;
  position: relative;
}

.message .content {
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* Markdown样式 */
.message .content :deep(h1),
.message .content :deep(h2),
.message .content :deep(h3),
.message .content :deep(h4),
.message .content :deep(h5),
.message .content :deep(h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
}

.message .content :deep(h1) {
  font-size: 1.5em;
}

.message .content :deep(h2) {
  font-size: 1.3em;
}

.message .content :deep(h3) {
  font-size: 1.1em;
}

.message .content :deep(p) {
  margin-bottom: 1em;
}

.message .content :deep(ul),
.message .content :deep(ol) {
  margin-bottom: 1em;
  padding-left: 2em;
}

.message .content :deep(li) {
  margin-bottom: 0.5em;
}

.message .content :deep(pre) {
  background: #f1f5f9;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 1em;
}

.message .content :deep(code) {
  font-family: monospace;
  background: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

.message .content :deep(pre code) {
  background: transparent;
  padding: 0;
  border-radius: 0;
}

.message .content :deep(blockquote) {
  border-left: 4px solid #e2e8f0;
  padding-left: 1em;
  margin-left: 0;
  margin-bottom: 1em;
  color: #64748b;
}

.message .content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1em;
}

.message .content :deep(th),
.message .content :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 0.5em;
  text-align: left;
}

.message .content :deep(th) {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.suggested-title {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
}

.question-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.question-item {
  background: #eff6ff;
  padding: 8px 12px;
  border-radius: 16px;
  font-size: 13px;
  color: #1e3a8a;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.question-item:hover {
  background: #dbeafe;
}

button.stop-button {
  background: #dc2626;
}

button.stop-button:hover {
  background: #b91c1c;
}

.message-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.copy-button {
  background: transparent;
  color: #64748b;
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.position-top-right {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  padding: 4px 8px;
  font-size: 11px;
}

.copy-button:hover {
  background: #f1f5f9;
  color: #1e3a8a;
}

.copy-button.success {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.copy-button i {
  margin-right: 4px;
}

/* 点赞按钮样式 */
.feedback-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  gap: 8px;
}

.feedback-button {
  background: transparent;
  color: #64748b;
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.feedback-button:hover {
  background: #f1f5f9;
  color: #1e3a8a;
}

.feedback-button.active {
  background: #1e3a8a;
  color: white;
  border-color: #1e3a8a;
}

.feedback-button i {
  margin-right: 4px;
}
</style>