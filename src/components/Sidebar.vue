<script setup>
import { ref, defineEmits, onMounted } from 'vue';
import QingdaoBankLogo from '../assets/qingdao-bank.ico';
import '../styles/Sidebar.css';

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