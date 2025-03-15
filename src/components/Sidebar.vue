<script setup>
import { ref, defineEmits, onMounted } from 'vue';
import QingdaoBankLogo from '../assets/qingdao-bank.ico';
import '../styles/Sidebar.css';

const historyItems = ref([]);
const emit = defineEmits(['select-history', 'select-chat', 'select-session', 'show-history-collection', 'select-favorite', 'show-favorites']);
const commonQuestions = ref([]);
const isCollapsed = ref(false);
const chatSessions = ref([]);
const currentSessionId = ref('');
const favoriteItems = ref([]);
const newChatButton = ref({ icon: 'fa-plus', name: '新建对话', action: 'new' });
const autoExpandEnabled = ref(true);
let collapseTimer = null; // 用于存储折叠计时器

const selectHistoryItem = (item) => {
  emit('select-history', item);
};

const selectFavoriteItem = (item) => {
  emit('select-favorite', item);
};

const selectChatAction = (action, sessionId) => {
  emit('select-chat', action, sessionId);
};

const selectSession = (sessionId) => {
  currentSessionId.value = sessionId;
  emit('select-session', sessionId);
};

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};   

const expandSidebar = () => {
  // 清除可能存在的折叠计时器
  if (collapseTimer) {
    clearTimeout(collapseTimer);
    collapseTimer = null;
  }
  
  if (isCollapsed.value && autoExpandEnabled.value) {
    isCollapsed.value = false;
  }
};

const collapseSidebar = () => {
  // 添加延时，避免用户意外移出鼠标时立即折叠
  collapseTimer = setTimeout(() => {
    if (!isCollapsed.value && autoExpandEnabled.value) {
      isCollapsed.value = true;
    }
  }, 600); // 600毫秒的延时
};

const showHistoryCollection = () => {
  emit('show-history-collection');
};

const showFavorites = () => {
  emit('show-favorites');
};

onMounted(() => {
  try {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      const parsedConversations = JSON.parse(savedConversations);
      if (Array.isArray(parsedConversations) && parsedConversations.length > 0) {
        chatSessions.value = parsedConversations;
        currentSessionId.value = parsedConversations[0].id;
      }
    }
    
    // 加载收藏列表
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      favoriteItems.value = JSON.parse(savedFavorites);
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});

const addHistoryItem = (item) => {
  if (!historyItems.value.includes(item)) {
    historyItems.value.unshift(item);
    
    if (historyItems.value.length > 10) {
      historyItems.value = historyItems.value.slice(0, 10);
    }
    
    try {
      localStorage.setItem('chat_history', JSON.stringify(historyItems.value));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }
};

const updateChatSessions = (sessions) => {
  if (Array.isArray(sessions)) {
    chatSessions.value = sessions;
    
    // 标记最新添加的会话
    if (sessions.length > 0) {
      setTimeout(() => {
        const firstSession = document.querySelector('.chat-session-item:first-child');
        if (firstSession) {
          firstSession.classList.add('new-session');
          
          // 5秒后移除新会话标记
          setTimeout(() => {
            firstSession.classList.remove('new-session');
          }, 5000);
        }
      }, 100);
    }
  }
};

const updateFavorites = (favorites) => {
  if (Array.isArray(favorites)) {
    favoriteItems.value = favorites;
  }
};

defineExpose({
  updateChatSessions,
  updateFavorites
});
</script>

<template>
  <aside 
    class="sidebar" 
    :class="{ 'collapsed': isCollapsed }"
    @mouseenter="expandSidebar"
    @mouseleave="collapseSidebar"
  >
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
      
      <!-- 收藏按钮 -->
      <div class="favorites-section">
        <div class="favorites-button-wrapper" v-if="!isCollapsed" @click="showFavorites">
          <i class="fas fa-star"></i>
          <span>我的收藏</span>
        </div>
        <div class="favorites-icon-wrapper" v-else @click="showFavorites">
          <i class="fas fa-star"></i>
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
      
      <div class="history-collection-section">
        <div class="history-button-wrapper" v-if="!isCollapsed" @click="showHistoryCollection">
          <i class="fas fa-history"></i>
          <span>历史记录</span>
        </div>
        <div class="history-icon-wrapper" v-else @click="showHistoryCollection">
          <i class="fas fa-history"></i>
        </div>
      </div>
    </div>
    
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
  </aside>
</template>

<style scoped>
/* 收藏按钮样式 */
.favorites-section {
  margin-bottom: 15px;
}

.favorites-button-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  color: #475569;
}

.favorites-button-wrapper:hover,
.favorites-icon-wrapper:hover {
  background-color: #f1f5f9;
  color: #334155;
}

.favorites-icon-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  color: #475569;
}

.favorites-button-wrapper i,
.favorites-icon-wrapper i {
  color: #eab308;
  font-size: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

.section-title i {
  color: #eab308;
  font-size: 12px;
}

/* 新增会话特效 */
@keyframes pulseHighlight {
  0%, 100% { border-color: #93c5fd; }
  50% { border-color: #3b82f6; }
}

.new-session {
  animation: pulseHighlight 2s ease infinite;
  border-width: 2px;
}

/* 添加过渡效果，使展开/折叠更平滑 */
.sidebar {
  transition: width 0.3s ease-in-out;
}

/* 聊天窗口项鼠标悬停效果 */
.chat-session-item {
  transform: translateX(0);
  transition: transform 0.2s ease-out, background-color 0.2s ease, border-color 0.2s ease;
}

.chat-session-item:hover {
  transform: translateX(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: #f0f9ff;
  border-color: #bfdbfe;
}

.session-content {
  transform: translateX(0);
  transition: transform 0.2s ease-out;
}

/* 对折叠状态下的聊天项也应用动画 */
.sidebar.collapsed .chat-session-item:hover {
  transform: translateX(5px);
}

/* 历史记录和收藏按钮悬停效果 */
.history-button-wrapper,
.favorites-button-wrapper,
.history-icon-wrapper,
.favorites-icon-wrapper {
  transform: translateX(0);
  transition: transform 0.2s ease-out, background-color 0.2s ease;
}

.history-button-wrapper:hover,
.favorites-button-wrapper:hover,
.history-icon-wrapper:hover,
.favorites-icon-wrapper:hover {
  transform: translateX(5px);
}
</style>
