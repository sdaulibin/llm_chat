<script setup>
import { ref, defineEmits, onMounted } from 'vue';
import QingdaoBankLogo from '../assets/qingdao-bank.ico';

// 定义事件
const emit = defineEmits(['select-history', 'select-chat', 'select-session']);

// 侧边栏组件，用于显示历史记录
const historyItems = ref([]);

// 常见问题列表
const commonQuestions = ref([]);

// 控制侧边栏折叠状态
const isCollapsed = ref(false);

// 会话列表
const chatSessions = ref([]);

// 当前选中的会话ID
const currentSessionId = ref('');

// 选择历史记录项目
const selectHistoryItem = (item) => {
  emit('select-history', item);
};

// 新建对话按钮
const newChatButton = ref({ icon: 'fa-plus', name: '新建对话', action: 'new' });

// 选择聊天操作
const selectChatAction = (action, sessionId) => {
  emit('select-chat', action, sessionId);
};

// 选择会话
const selectSession = (sessionId) => {
  currentSessionId.value = sessionId;
  // 触发会话选择事件
  emit('select-session', sessionId);
};

// 切换侧边栏折叠状态
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};

// 从本地存储加载历史记录和会话列表
onMounted(() => {
  try {
    // 加载历史记录
    const savedHistory = localStorage.getItem('chat_history');
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory);
      if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
        historyItems.value = parsedHistory;
      }
    }
    
    // 加载会话列表
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      const parsedConversations = JSON.parse(savedConversations);
      if (Array.isArray(parsedConversations) && parsedConversations.length > 0) {
        chatSessions.value = parsedConversations;
        // 默认选中第一个会话
        currentSessionId.value = parsedConversations[0].id;
      }
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});

// 添加新的历史记录
const addHistoryItem = (item) => {
  // 避免重复添加
  if (!historyItems.value.includes(item)) {
    // 添加到历史记录开头
    historyItems.value.unshift(item);
    
    // 限制历史记录数量为10条
    if (historyItems.value.length > 10) {
      historyItems.value = historyItems.value.slice(0, 10);
    }
    
    // 保存到本地存储
    try {
      localStorage.setItem('chat_history', JSON.stringify(historyItems.value));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }
};

// 更新聊天会话列表
const updateChatSessions = (sessions) => {
  if (Array.isArray(sessions)) {
    chatSessions.value = sessions;
  }
};

// 暴露方法给父组件
defineExpose({
  addHistoryItem,
  updateChatSessions
});
</script>

<template>
  <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">
    <div class="sidebar-bottom">
      <div class="new-chat-button" @click="selectChatAction(newChatButton.action)" v-if="!isCollapsed">
        <i :class="['fas', newChatButton.icon]"></i>
        <span>{{ newChatButton.name }}</span>
      </div>
      <div class="new-chat-button-icon" @click="selectChatAction(newChatButton.action)" v-else>
        <i :class="['fas', newChatButton.icon]"></i>
      </div>
      <div class="toggle-button" @click="toggleSidebar">
        <i :class="['fas', isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left']"></i>
      </div>
    </div>
    <div class="sidebar-content">
      <div class="sidebar-header">
        <div class="logo-container">
          <img :src="QingdaoBankLogo" alt="智能办公助手" class="logo" />
        </div>
        <h2 v-if="!isCollapsed">智能办公助手</h2>
      </div>
      
      
      
      <div class="common-questions-section">
        <div v-for="(item, index) in commonQuestions" :key="index" class="common-question-item" @click="selectHistoryItem(item.text)">
          <i :class="['fas', item.icon]"></i>
          <span v-if="!isCollapsed">{{ item.text }}</span>
        </div>
      </div>
      
      <div class="chat-sessions-section">
        <div class="section-title" v-if="!isCollapsed">聊天列表</div>
        <div class="chat-sessions-list">
          <div v-for="(session, index) in chatSessions" :key="session.id" 
               class="chat-session-item" 
               :class="{ 'active': currentSessionId === session.id }">
            <div class="session-content" @click="selectSession(session.id)">
              <i class="fas fa-comment"></i>
              <span v-if="!isCollapsed">{{ session.lastQuestion || session.title }}</span>
            </div>
            <button 
              v-if="!isCollapsed" 
              class="delete-button" 
              @click.stop="selectChatAction('delete', session.id)" 
              title="删除对话">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <div v-if="chatSessions.length === 0" class="no-sessions">
            <i class="fas fa-info-circle"></i>
            <span v-if="!isCollapsed">暂无聊天会话</span>
          </div>
        </div>
      </div>
      
      <div class="history-section">
        <div class="section-title" v-if="!isCollapsed">历史记录</div>
        <div class="history-list">
          <div v-for="(item, index) in historyItems" :key="index" class="history-item" @click="selectHistoryItem(item)">
            <i class="fas fa-history"></i>
            <span v-if="!isCollapsed">{{ item }}</span>
          </div>
          <div v-if="historyItems.length === 0" class="no-history">
            <i class="fas fa-info-circle"></i>
            <span v-if="!isCollapsed">暂无历史记录</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 280px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.3s ease;
  height: calc(100vh - 40px);
  overflow: hidden;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #e60012;
  border-radius: 8px;
}

.logo {
  width: 24px;
  height: 24px;
  filter: brightness(0) invert(1);
}

.sidebar.collapsed {
  width: 70px;
}

.sidebar.collapsed .sidebar-content {
  align-items: center;
}

.sidebar.collapsed .chat-action-item {
  justify-content: center;
  width: 40px;
  height: 40px;
}

.sidebar.collapsed .chat-action-item i {
  margin-right: 0;
  font-size: 18px;
}

.sidebar.collapsed .history-item,
.sidebar.collapsed .common-question-item {
  justify-content: center;
  width: 40px;
  height: 40px;
}

.sidebar.collapsed .history-item i,
.sidebar.collapsed .common-question-item i {
  margin-right: 0;
  font-size: 18px;
}

.sidebar.collapsed .no-history {
  justify-content: center;
}

.sidebar-bottom {
  position: absolute;
  right: 0;
  bottom: 20px;
  display: flex;
  align-items: center;
  z-index: 1;
}

.new-chat-button {
  padding: 8px 16px;
  background: #1e3a8a;
  color: white;
  border-radius: 20px;
  margin-right: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.new-chat-button:hover {
  background: #1e40af;
}

.new-chat-button-icon {
  width: 36px;
  height: 36px;
  background: #1e3a8a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  margin-right: 16px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.new-chat-button-icon:hover {
  background: #1e40af;
}

.toggle-button {
  width: 24px;
  height: 24px;
  background: #1e3a8a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  position: relative;
  right: -12px;
}

.toggle-button:hover {
  background: #1e40af;
}



.common-questions-section {
  border-bottom: 1px solid #f0f0f0;
}

.common-question-item {
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.common-question-item:hover {
  background: #f1f5f9;
}

.common-question-item i {
  color: #64748b;
}

.chat-sessions-section {
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 10px;
  padding-bottom: 10px;
}

.section-title {
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
}

.chat-sessions-list {
  max-height: 200px;
  overflow-y: auto;
}

.chat-session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  cursor: pointer;
}

.session-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.delete-button {
  background: transparent;
  color: #94a3b8;
  padding: 4px;
  border-radius: 4px;
  font-size: 12px;
  display: none;
  border: none;
}

.chat-session-item:hover .delete-button {
  display: flex;
}

.delete-button:hover {
  background: #fee2e2;
  color: #ef4444;
}

.chat-session-item:hover {
  background: #f1f5f9;
}

.chat-session-item.active {
  background: #e0f2fe;
  border-left: 3px solid #0ea5e9;
}

.chat-session-item i {
  color: #64748b;
}

.no-sessions {
  padding: 12px 20px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 8px;
  font-style: italic;
}

.history-section {
  flex: 1;
  overflow-y: auto;
}

.sidebar-header h2 {
  font-size: 16px;
  color: #333;
  font-weight: 600;
  margin: 0;
}

.history-list {
  flex: 1;
  overflow-y: auto;
}

.history-item {
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-item:hover {
  background: #f1f5f9;
}

.history-item i {
  color: #64748b;
}

.no-history {
  padding: 12px 20px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 8px;
  font-style: italic;
}
</style>