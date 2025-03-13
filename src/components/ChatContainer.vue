<script setup>
import { ref, watch, onMounted } from 'vue';
import { setApiKey, sendChatMessage, handleStreamResponse, stopChatMessage, getSuggestedQuestions, feedbackMessage, uploadFile } from '../services/difyApi';
import MarkdownIt from 'markdown-it';
import '../styles/ChatContainer.css';

const props = defineProps({
  selectedHistory: { type: String, default: '' },
  conversationId: { type: String, default: '' }
});

const emit = defineEmits(['add-history', 'save-conversation']);


// 重置聊天内容的方法
const resetChat = () => {
  messages.value = [
    {
      type: 'bot',
      content: '您好！我是您的智能办公助手。请问有什么可以帮您？',
      messageId: null,
      feedback: null
    }
  ];
  conversationId.value = '';
  currentMessageId.value = '';
  isLoading.value = false;
  suggestedQuestions.value = [];
  newMessage.value = '';
};

// 加载会话内容的方法
const loadConversation = (session) => {
  if (session && session.id) {
    conversationId.value = session.id;
    // 如果会话有保存的消息，则加载这些消息
    if (session.messages && session.messages.length > 0) {
      messages.value = session.messages;
    } else {
      // 否则重置聊天
      resetChat();
    }
  }
};

// 保存当前会话消息
const saveCurrentConversation = () => {
  if (props.conversationId) {
    // 触发保存事件，让父组件处理保存逻辑
    emit('save-conversation', {
      id: props.conversationId,
      messages: messages.value
    });
  }
};

// 暴露方法给父组件
defineExpose({
  resetChat,
  loadConversation
});

const API_KEY = ref('app-dRSe1A33PkkMZiXTp6JHrQdy');
const conversationId = ref('');
const currentMessageId = ref('');
const isLoading = ref(false);
const suggestedQuestions = ref([]);
const uploadedFiles = ref([]);
const isUploading = ref(false);
const uploadError = ref('');
const copySuccess = ref(null);
const newMessage = ref('');

const messages = ref([
  {
    type: 'bot',
    content: '您好！我是您的智能办公助手。请先设置API密钥以开始对话。',
    messageId: null,
    feedback: null
  }
]);

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang) {
      return `<pre class="language-${lang}"><code class="language-${lang}">${str}</code></pre>`;
    } 
    return `<pre><code>${str}</code></pre>`;
  }
});

onMounted(() => {
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



const handleFileUpload = async (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  isUploading.value = true;
  uploadError.value = '';
  
  try {
    // 检查文件类型
    const file = files[0];
    const allowedTypes = {
      // 文档类型
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'text/markdown': 'markdown',
      'text/mdx': 'mdx',
      'text/html': 'html',
      'text/htm': 'htm',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/csv': 'csv',
      'text/md': 'md'
    };
    
    if (!allowedTypes[file.type]) {
      throw new Error('不支持的文件类型，请上传txt、markdown、mdx、pdf、html、xlsx、xls、docx、csv、md或htm格式的文件');
    }
    
    // 上传文件
    const result = await uploadFile(file, 'abc-123', props.conversationId);
    
    // 确定文件类型
    const fileType = allowedTypes[file.type];
    
    // 创建预览URL（仅对图片有效）
    let previewUrl = null;
    if (fileType === 'image') {
      previewUrl = URL.createObjectURL(file);
    }
    
    // 添加到已上传文件列表
    uploadedFiles.value.push({
      id: result.id,
      name: result.name,
      type: "document",
      transfer_method: 'local_file',
      upload_file_id: result.id,
      preview: previewUrl,
      originalType: file.type
    });
    
  } catch (error) {
    console.error('文件上传失败:', error);
    uploadError.value = error.message || '文件上传失败，请重试';
  } finally {
    isUploading.value = false;
    // 清空文件输入框，允许重新选择同一文件
    event.target.value = '';
  }
};

const removeFile = (fileId) => {
  const fileIndex = uploadedFiles.value.findIndex(file => file.id === fileId);
  if (fileIndex !== -1) {
    // 如果文件有预览URL，释放它
    if (uploadedFiles.value[fileIndex].preview) {
      URL.revokeObjectURL(uploadedFiles.value[fileIndex].preview);
    }
    uploadedFiles.value.splice(fileIndex, 1);
  }
};

const sendToDify = async (query) => {
  isLoading.value = true;
  try {
    const files = uploadedFiles.value.map(file => ({
      type: file.type,
      transfer_method: file.transfer_method,
      upload_file_id: file.upload_file_id
    }));
    
    // 发送消息到Dify API
    const response = await sendChatMessage({
      query,
      inputs: {}, // 应用定义的变量值
      conversationId: '', // 不基于之前的聊天记录继续对话，发送空字符串
      user: 'abc-123', // 使用文档中的用户标识
      streaming: true, // 使用流式响应
      files: files, // 添加上传的文件
      session_id: props.conversationId // 传递当前对话ID
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
  if ((!newMessage.value.trim() && uploadedFiles.value.length === 0) || isLoading.value) return;
  
  // 构建用户消息内容
  let userContent = newMessage.value;
  
  // 添加用户消息
  messages.value.push({
    type: 'user',
    content: userContent,
    files: [...uploadedFiles.value] // 保存文件信息的副本
  });
  
  const userQuestion = newMessage.value;
  newMessage.value = '';
  
  // 将问题添加到历史记录
  emit('add-history', userQuestion);
  
  // 保存当前会话消息
  saveCurrentConversation();
  
  // 发送消息到Dify API
  sendToDify(userQuestion);
  
  // 清空已上传的文件列表
  uploadedFiles.value = [];
};

const stopResponse = async () => {
  if (!currentMessageId.value || !isLoading.value) return;
  
  try {
    await stopChatMessage(currentMessageId.value, 'abc-123', props.conversationId);
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

const fetchSuggestedQuestions = async (messageId) => {
  try {
    const response = await getSuggestedQuestions(messageId, 'abc-123', props.conversationId);
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

const useSuggestedQuestion = (question) => {
  if (!question) return;
  
  // 设置问题到输入框
  newMessage.value = question;
  
  // 发送消息
  sendMessage();
  
  // 清空建议问题列表
  suggestedQuestions.value = [];
};

const copyToClipboard = (content) => {
  const tempElement = document.createElement('div');
  tempElement.innerHTML = content;
  const textContent = tempElement.textContent || tempElement.innerText;
  
  navigator.clipboard.writeText(textContent)
    .then(() => showCopySuccess())
    .catch(err => {
      console.error('复制失败:', err);
      alert('复制失败，请重试');
    });
};

const showCopySuccess = () => {
  copySuccess.value = true;
  setTimeout(() => copySuccess.value = null, 2000);
};

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
    await feedbackMessage(messageId, newRating, 'abc-123', '', props.conversationId);
    
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
        <!-- 显示上传的文件 -->
        <div v-if="message.files && message.files.length > 0" class="message-files">
          <div v-for="file in message.files" :key="file.id" class="message-file-preview">
            <!-- 图片类型显示预览图 -->
            <img v-if="file.type === 'image' && file.preview" :src="file.preview" :alt="file.name" />
            <!-- 非图片类型显示对应图标 -->
            <div v-else class="file-icon-message">
              <i class="fas" :class="{
                'fa-file-pdf': file.type === 'pdf',
                'fa-file-word': file.type === 'word',
                'fa-file-excel': file.type === 'xlsx' || file.type === 'xls' || file.type === 'csv',
                'fa-file-code': file.type === 'html' || file.type === 'htm',
                'fa-file-alt': file.type === 'txt' || file.type === 'markdown' || file.type === 'mdx' || file.type === 'md',
                'fa-file': !['pdf', 'word', 'docx', 'xlsx', 'xls', 'csv', 'html', 'htm', 'txt', 'markdown', 'mdx', 'md'].includes(file.type)
              }"></i>
              <span class="file-name-message">{{ file.name }}</span>
            </div>
          </div>
        </div>
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
    
    <!-- 文件上传区域 -->
    <div class="file-upload-area">
      <label for="file-upload" class="file-upload-button" :class="{ 'disabled': isUploading }">
        <i class="fas fa-file"></i>
        {{ isUploading ? '上传中...' : '上传文件' }}
      </label>
      <input 
        id="file-upload" 
        type="file" 
        accept="text/plain,text/markdown,text/mdx,application/pdf,text/html,text/htm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,text/md" 
        @change="handleFileUpload" 
        :disabled="isUploading"
      />
      
      <!-- 上传错误提示 -->
      <div v-if="uploadError" class="upload-error">
        <i class="fas fa-exclamation-circle"></i>
        {{ uploadError }}
      </div>
      
      <!-- 已上传文件预览 -->
      <div v-if="uploadedFiles.length > 0" class="uploaded-files">
        <div v-for="file in uploadedFiles" :key="file.id" class="file-preview">
          <!-- 图片类型显示预览图 -->
          <img v-if="file.type === 'image'" :src="file.preview" :alt="file.name" />
          <!-- 非图片类型显示对应图标 -->
          <div v-else class="file-icon">
            <i class="fas" :class="{
              'fa-file-pdf': file.type === 'pdf',
              'fa-file-word': file.type === 'docx',
              'fa-file-excel': file.type === 'xlsx' || file.type === 'xls' || file.type === 'csv',
              'fa-file-code': file.type === 'html' || file.type === 'htm',
              'fa-file-alt': file.type === 'txt' || file.type === 'markdown' || file.type === 'mdx' || file.type === 'md',
              'fa-file': !['pdf', 'docx', 'xlsx', 'xls', 'csv', 'html', 'htm', 'txt', 'markdown', 'mdx', 'md'].includes(file.type)
            }"></i>
            <span class="file-name">{{ file.name }}</span>
          </div>
          <button class="remove-file" @click="removeFile(file.id)">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
    
    <div class="input-box">
      <div class="input-content">
        <textarea v-model="newMessage" placeholder="请输入您的问题..." @keyup.enter.ctrl="sendMessage"></textarea>
      </div>
      <div class="input-actions">
        <button v-if="!isLoading" @click="sendMessage" :disabled="showApiKeyInput || isUploading">
          <i class="fas fa-paper-plane"></i>
          发送
        </button>
        <button v-else class="stop-button" @click="stopResponse">
          <i class="fas fa-stop"></i>
          停止
        </button>
      </div>
    </div>
  </div>
</template>