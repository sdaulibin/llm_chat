<script setup>
import { ref, defineEmits, onMounted } from 'vue';
import QingdaoBankLogo from '../assets/qingdao-bank.ico';
import '../styles/Sidebar.css';

const emit = defineEmits(['select-history', 'select-chat', 'select-session']);
const historyItems = ref([]);
const commonQuestions = ref([]);
const isCollapsed = ref(false);
const chatSessions = ref([]);
const currentSessionId = ref('');
const newChatButton = ref({ icon: 'fa-plus', name: '新建对话', action: 'new' });

const selectHistoryItem = (item) => {
  emit('select-history', item);
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

onMounted(() => {
  try {
    const savedHistory = localStorage.getItem('chat_history');
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory);
      if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
        historyItems.value = parsedHistory;
      }
    }
    
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      const parsedConversations = JSON.parse(savedConversations);
      if (Array.isArray(parsedConversations) && parsedConversations.length > 0) {
        chatSessions.value = parsedConversations;
        currentSessionId.value = parsedConversations[0].id;
      }
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
  }
};

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