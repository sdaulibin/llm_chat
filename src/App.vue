<script setup>
import { ref, onMounted } from 'vue';
import Sidebar from './components/Sidebar.vue';
import ChatContainer from './components/ChatContainer.vue';

// 用于存储当前选中的历史记录项目
const selectedHistory = ref('');
// 侧边栏组件引用
const sidebarRef = ref(null);
// 聊天容器组件引用
const chatContainerRef = ref(null);
// 当前会话ID
const currentConversationId = ref('');
// 会话列表
const conversations = ref([]);
// 弹窗控制
const showLimitDialog = ref(false);

// 初始化应用
onMounted(() => {
  // 从本地存储加载会话列表
  try {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      conversations.value = JSON.parse(savedConversations);
    }
  } catch (error) {
    console.error('加载会话列表失败:', error);
  }
  
  // 如果没有会话，创建一个新会话
  if (conversations.value.length === 0) {
    createNewConversation();
  } else {
    // 使用最近的会话
    currentConversationId.value = conversations.value[0].id;
  }
});

// 创建新会话
const createNewConversation = () => {
  // 检查是否已达到最大对话数量限制(5个)
  if (conversations.value.length >= 5) {
    showLimitDialog.value = true;
    return;
  }
  
  const newConversation = {
    id: 'conv-' + Date.now(),
    title: '新的聊天',
    createdAt: new Date().toISOString(),
    messages: [],
    lastQuestion: ''
  };
  
  // 添加到会话列表开头
  conversations.value.unshift(newConversation);
  currentConversationId.value = newConversation.id;
  
  // 保存到本地存储
  saveConversations();
  
  // 重置聊天容器
  if (chatContainerRef.value) {
    chatContainerRef.value.resetChat();
  }
  
  // 更新侧边栏的会话列表
  if (sidebarRef.value) {
    // 确保侧边栏组件更新会话列表
    sidebarRef.value.updateChatSessions(conversations.value);
  }
};

// 关闭限制对话框
const closeLimitDialog = () => {
  showLimitDialog.value = false;
};

// 保存会话列表到本地存储
const saveConversations = () => {
  try {
    localStorage.setItem('conversations', JSON.stringify(conversations.value));
  } catch (error) {
    console.error('保存会话列表失败:', error);
  }
};

// 处理历史记录选择事件
const handleSelectHistory = (item) => {
  selectedHistory.value = item;
};

// 处理新消息添加到历史记录
const handleAddHistory = (query) => {
  if (sidebarRef.value) {
    sidebarRef.value.addHistoryItem(query);
  }
};

// 处理会话选择
const handleSelectSession = (sessionId) => {
  currentConversationId.value = sessionId;
  // 找到对应的会话
  const session = conversations.value.find(s => s.id === sessionId);
  if (session && chatContainerRef.value) {
    // 加载会话消息
    chatContainerRef.value.loadConversation(session);
  }
};

// 处理保存会话
const handleSaveConversation = (conversation) => {
  if (!conversation || !conversation.id) return;
  
  // 查找会话在列表中的索引
  const index = conversations.value.findIndex(c => c.id === conversation.id);
  
  if (index !== -1) {
    // 更新现有会话
    conversations.value[index].messages = conversation.messages;
    
    // 查找最新的用户消息作为lastQuestion
    if (conversation.messages.length > 0) {
      // 从后往前查找用户消息
      for (let i = conversation.messages.length - 1; i >= 0; i--) {
        if (conversation.messages[i].type === 'user') {
          conversations.value[index].lastQuestion = conversation.messages[i].content;
          break;
        }
      }
    }
    
    // 如果是第一条消息，更新会话标题
    if (conversation.messages.length > 0 && conversations.value[index].title === '新的聊天') {
      // 使用用户的第一条消息作为标题
      const userMessage = conversation.messages.find(m => m.type === 'user');
      if (userMessage) {
        // 截取前20个字符作为标题
        conversations.value[index].title = userMessage.content.substring(0, 20);
      }
    }
  }
  
  // 保存到本地存储
  saveConversations();
};

// 删除会话
const deleteConversation = (sessionId) => {
  // 查找要删除的会话索引
  const index = conversations.value.findIndex(c => c.id === sessionId);
  if (index === -1) return;
  
  // 从列表中移除
  conversations.value.splice(index, 1);
  
  // 如果删除的是当前选中的会话，则选择第一个会话或创建新会话
  if (currentConversationId.value === sessionId) {
    if (conversations.value.length > 0) {
      // 选择第一个会话
      currentConversationId.value = conversations.value[0].id;
      // 加载该会话
      if (chatContainerRef.value) {
        chatContainerRef.value.loadConversation(conversations.value[0]);
      }
    } else {
      // 如果没有会话了，创建一个新会话
      createNewConversation();
    }
  }
  
  // 保存到本地存储
  saveConversations();
  
  // 更新侧边栏的会话列表
  if (sidebarRef.value) {
    sidebarRef.value.updateChatSessions(conversations.value);
  }
};

// 处理聊天操作
const handleSelectChat = (action, sessionId) => {
  console.log('选择的聊天操作:', action, sessionId);
  if (action === 'new') {
    createNewConversation();
  } else if (action === 'delete' && sessionId) {
    deleteConversation(sessionId);
  }
};
</script>

<template>
  <div class="container">
    <Sidebar ref="sidebarRef" @select-chat="handleSelectChat" @select-history="handleSelectHistory" @select-session="handleSelectSession" />
    <main class="main-content">
      <ChatContainer 
        ref="chatContainerRef"
        :selectedHistory="selectedHistory" 
        @add-history="handleAddHistory" 
        @save-conversation="handleSaveConversation"
        :conversationId="currentConversationId"
      />
    </main>
    
    <!-- 对话数量限制弹窗 -->
    <div class="dialog-overlay" v-if="showLimitDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <i class="fas fa-exclamation-circle"></i>
          <h3>对话数量限制</h3>
        </div>
        <div class="dialog-body">
          您已达到最大对话数量限制(5个)，请删除一些对话后再创建新对话。
        </div>
        <div class="dialog-footer">
          <button @click="closeLimitDialog" class="dialog-button">我知道了</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.container {
  display: flex;
  height: 100vh;
  padding: 20px;
  gap: 20px;
  background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
}

.main-content {
  flex: 1;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

/* 弹窗样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 400px;
  max-width: 90%;
  overflow: hidden;
  animation: dialog-fade-in 0.3s ease;
}

@keyframes dialog-fade-in {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.dialog-header {
  background: #1e3a8a;
  color: white;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.dialog-header i {
  font-size: 20px;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.dialog-body {
  padding: 20px;
  color: #334155;
  font-size: 14px;
  line-height: 1.6;
}

.dialog-footer {
  padding: 12px 20px 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-button {
  padding: 8px 16px;
  background: #1e3a8a;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.dialog-button:hover {
  background: #1e40af;
}
</style>
