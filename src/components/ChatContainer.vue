<script setup>
import { ref, watch, onMounted } from 'vue';
import { setApiKey, sendChatMessage, handleStreamResponse, stopChatMessage, getSuggestedQuestions, feedbackMessage, uploadFile } from '../services/difyApi';
import MarkdownIt from 'markdown-it';
import '../styles/ChatContainer.css';

const props = defineProps({
  selectedHistory: { type: String, default: '' },
  conversationId: { type: String, default: '' }
});

const emit = defineEmits(['add-history', 'save-conversation', 'add-to-favorites']);

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
  currentTaskId.value = '';
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
const currentTaskId = ref('');
const isLoading = ref(false);
const suggestedQuestions = ref([]);
const uploadedFiles = ref([]);
const isUploading = ref(false);
const uploadError = ref('');
const copySuccess = ref(null);
const newMessage = ref('');

const editingMessageIndex = ref(null); // 当前正在编辑的消息索引
const isEditing = ref(false); // 是否处于编辑模式
const editTooltip = ref(false); // 新增：控制编辑提示的显示

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

// 收藏消息功能
const favoriteMessage = (message) => {
  if (!message || !message.content) return;
  
  // 创建收藏对象并传递给父组件
  const favoriteItem = {
    id: `fav-${Date.now()}`,
    time: new Date().toISOString(),
    content: message.content
  };
  
  emit('add-to-favorites', favoriteItem);
};

// 修改编辑功能，只复制内容到输入框，并显示临时提示
const editMessage = (index) => {
  const message = messages.value[index];
  if (message && message.type === 'user') {
    newMessage.value = message.content;
    
    // 显示临时提示
    editTooltip.value = true;
    // 3秒后自动隐藏提示
    setTimeout(() => {
      editTooltip.value = false;
    }, 3000);
    
    // 不再设置isEditing为true，因为我们不再使用永久性提示
    // 但仍然将其设为true以便输入框获得焦点
    isEditing.value = true;
  }
};

// 修改取消编辑功能
const cancelEdit = () => {
  newMessage.value = '';
  editingMessageIndex.value = null;
  isEditing.value = false;
  editTooltip.value = false; // 确保提示被隐藏
};

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

        // 保存当前taskId，用于停止响应
        if (data.taskId && !currentTaskId.value) {
          currentTaskId.value = data.taskId;
        }
        
        // 如果是第一次收到消息，创建新的机器人消息
        if (!messages.value.find(m => m.type === 'bot' && m.isLoading)) {
          messages.value.push({
            type: 'bot',
            content: fullResponse,
            isLoading: true,
            messageId: data.messageId,
            taskId: data.taskId,
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
        currentTaskId.value = ''
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
        currentTaskId.value = ''
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
    currentTaskId.value = ''
  }
};

// 修改发送消息函数，确保发送后隐藏提示
const sendMessage = () => {
  if ((!newMessage.value.trim() && uploadedFiles.value.length === 0) || isLoading.value) return;
  
  // 构建用户消息内容
  let userContent = newMessage.value;
  
  // 无论是编辑还是新消息，都直接添加为新消息
  messages.value.push({
    type: 'user',
    content: userContent,
    files: [...uploadedFiles.value] // 保存文件信息的副本
  });
  
  const userQuestion = newMessage.value;
  newMessage.value = '';
  
  // 重置编辑模式
  isEditing.value = false;
  editTooltip.value = false; // 隐藏提示
  
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
  if (!currentTaskId.value || !isLoading.value) return;
  
  try {
    console.log('停止响应请求发送中...'+currentTaskId.value);
    const taskIdToStop = currentTaskId.value; // 保存当前taskId的副本
    currentTaskId.value = ''; // 立即清空currentTaskId，防止重复请求
    await stopChatMessage(taskIdToStop, 'abc-123', props.conversationId);
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
    <div v-for="(message, index) in messages" :key="index" class="message" :class="{ 
      user: message.type === 'user', 
      error: message.isError,
      'history-collection': message.content.includes('历史记录集合')
    }">
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
        
        <!-- 修改结构，为用户消息创建一个包含内容和按钮的容器 -->
        <div v-if="message.type === 'user'" class="user-bubble-container">
          <!-- 内容部分 -->
          <div class="content" v-html="message.content.replace(/\n/g, '<br>')"></div>
          
          <!-- 用户消息的操作按钮，直接跟在内容后面 -->
          <div class="user-message-actions">
            <button class="action-button favorite-button" @click="favoriteMessage(message)" title="收藏">
              <i class="fas fa-star"></i>
            </button>
            <button class="action-button edit-button" @click="editMessage(index)" title="编辑">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </div>
        
        <!-- AI消息内容 -->
        <div v-if="message.type === 'bot'" class="content" v-html="md.render(message.content)"></div>
        
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
    <!-- 移除固定的编辑模式提示，改为动态提示 -->
    <div v-if="editTooltip" class="edit-tooltip">
      <i class="fas fa-info-circle"></i>
      <span>已复制原消息到输入框，修改后将作为新消息发送</span>
    </div>
    
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
          <i class="fas fa-stop fa-spin"></i>
          停止
        </button>
      </div>
    </div>
  </div>
</template>

<style>
/* 历史记录集合特殊样式 */
.message.history-collection .content {
  background: #f0f9ff;
  border-left: 4px solid #0ea5e9;
}

.message.history-collection .content h2 {
  color: #0369a1;
  margin-bottom: 16px;
}

.message.history-collection .content ol,
.message.history-collection .content ul {
  padding-left: 24px;
}

.message.history-collection .content li {
  margin-bottom: 8px;
  line-height: 1.5;
}

/* 动态编辑提示样式 */
.edit-tooltip {
  position: absolute;
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(49, 130, 206, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 80%;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  animation: fadeInOut 3s ease-in-out forwards;
}

.edit-tooltip::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid rgba(49, 130, 206, 0.9);
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translate(-50%, 10px); }
  10% { opacity: 1; transform: translate(-50%, 0); }
  90% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, -10px); }
}

.input-container {
  position: relative; /* 为了定位动态提示 */
}

/* 更新加载中动画样式 */
.stop-button {
  background-color: #ef4444;
  color: white;
  border: none;
  transition: all 0.2s ease;
}

.stop-button:hover {
  background-color: #dc2626;
}

.stop-button .fa-spin {
  animation: pulse-spin 1.5s linear infinite;
}

@keyframes pulse-spin {
  0% { transform: rotate(0deg); opacity: 0.7; }
  50% { transform: rotate(180deg); opacity: 1; }
  100% { transform: rotate(360deg); opacity: 0.7; }
}

/* 删除不需要的样式 */
.loading-icon,
.stop-icon {
  display: none;
}
</style>
