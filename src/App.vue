<script setup>
import { ref, onMounted, computed } from 'vue';
import Sidebar from './components/Sidebar.vue';
import ChatContainer from './components/ChatContainer.vue';
import './styles/App.css';

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
// 历史记录弹窗控制
const showHistoryDialog = ref(false);
// 收藏弹窗控制
const showFavoritesDialog = ref(false);
// 历史记录列表
const historyItems = ref([]);
// 历史记录搜索关键词
const searchKeyword = ref('');
// 收藏搜索关键词
const favoritesSearchKeyword = ref('');
// 确认清空历史记录弹窗控制
const showClearConfirmDialog = ref(false);
// 收藏列表（独立的数据集）
const favoriteItems = ref([]);

// 根据搜索关键词过滤历史记录
const filteredHistoryItems = computed(() => {
  // 根据搜索关键词筛选
  if (!searchKeyword.value.trim()) {
    return historyItems.value;
  }
  
  const keyword = searchKeyword.value.toLowerCase().trim();
  // 拆分关键词为独立的部分
  const keywordParts = keyword.split(/\s+/).filter(part => part.length > 0);
  
  return historyItems.value.filter(item => {
    const content = typeof item === 'object' ? item.content : item;
    const contentLower = content.toLowerCase();
    
    // 确保所有关键词部分都包含在内容中
    for (const part of keywordParts) {
      if (!contentLower.includes(part)) {
        return false; // 如果有任一关键词部分不匹配，则整体不匹配
      }
    }
    return true; // 所有关键词部分都匹配
  });
});

// 根据搜索关键词过滤收藏列表
const filteredFavoriteItems = computed(() => {
  if (!favoritesSearchKeyword.value.trim()) {
    return favoriteItems.value;
  }
  
  const keyword = favoritesSearchKeyword.value.toLowerCase().trim();
  // 拆分关键词为独立的部分
  const keywordParts = keyword.split(/\s+/).filter(part => part.length > 0);
  
  return favoriteItems.value.filter(item => {
    const content = item.content;
    const contentLower = content.toLowerCase();
    
    // 确保所有关键词部分都包含在内容中
    for (const part of keywordParts) {
      if (!contentLower.includes(part)) {
        return false; // 如果有任一关键词部分不匹配，则整体不匹配
      }
    }
    return true; // 所有关键词部分都匹配
  });
});

// 高亮显示匹配的关键词
const highlightMatchedText = (text, keyword) => {
  if (!keyword || !keyword.trim()) {
    return text;
  }
  
  let result = text;
  const keywordParts = keyword.toLowerCase().trim().split(/\s+/).filter(part => part.length > 0);
  
  // 为每个关键词部分添加高亮
  keywordParts.forEach(part => {
    if (part.length > 0) {
      // 创建正则表达式用于大小写不敏感匹配
      const regex = new RegExp(`(${part})`, 'gi');
      result = result.replace(regex, '<span class="highlight-keyword">$1</span>');
    }
  });
  
  return result;
};

// 初始化应用
onMounted(() => {
  // 从本地存储加载会话列表
  try {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
      conversations.value = JSON.parse(savedConversations);
    }
    
    // 加载收藏列表
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      favoriteItems.value = JSON.parse(savedFavorites);
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  }
  
  // 如果没有会话，创建一个新会话
  if (conversations.value.length === 0) {
    createNewConversation();
  } else {
    // 使用最近的会话
    currentConversationId.value = conversations.value[0].id;
  }
  
  // 更新侧边栏的收藏列表
  if (sidebarRef.value) {
    sidebarRef.value.updateFavorites(favoriteItems.value);
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

// 保存收藏列表到本地存储
const saveFavorites = () => {
  try {
    localStorage.setItem('favorites', JSON.stringify(favoriteItems.value));
  } catch (error) {
    console.error('保存收藏列表失败:', error);
  }
};

// 处理历史记录选择事件
const handleSelectHistory = (item) => {
  selectedHistory.value = item;
};

// 处理收藏选择事件
const handleSelectFavorite = (item) => {
  selectedHistory.value = item.content;
};

// 处理新消息添加到历史记录
const handleAddHistory = (query) => {
  try {
    // 直接操作本地存储
    const savedHistory = localStorage.getItem('chat_history');
    let historyItems = [];
    
    if (savedHistory) {
      historyItems = JSON.parse(savedHistory);
    }
    
    // 确保是数组
    if (!Array.isArray(historyItems)) {
      historyItems = [];
    }
    
    // 创建新的历史记录对象，包含时间、内容、ID
    const now = new Date();
    // 格式化为更通用的时间格式：yyyy-MM-dd HH:mm
    const formattedTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newHistoryItem = {
      id: `hist-${Date.now()}`,
      time: formattedTime,
      content: query
    };
    
    // 检查是否已存在相同内容的记录
    const existingIndex = historyItems.findIndex(item => 
      typeof item === 'object' ? item.content === query : item === query
    );
    
    if (existingIndex === -1) {
      // 不存在则添加新记录
      historyItems.unshift(newHistoryItem);
      
      // 限制历史记录数量
      if (historyItems.length > 10) {
        historyItems = historyItems.slice(0, 10);
      }
      
      // 保存回本地存储
      localStorage.setItem('chat_history', JSON.stringify(historyItems));
    }
  } catch (error) {
    console.error('保存历史记录失败:', error);
  }
};

// 将历史记录添加到收藏
const addToFavorites = (item) => {
  if (!item || !item.content) return;
  
  // 检查是否已收藏
  const exists = favoriteItems.value.some(fav => 
    fav.content === item.content
  );
  
  if (!exists) {
    // 创建新的收藏对象
    const favoriteItem = {
      id: `fav-${Date.now()}`,
      time: item.time || new Date().toISOString(),
      content: item.content
    };
    
    // 添加到收藏
    favoriteItems.value.unshift(favoriteItem);
    
    // 保存收藏
    saveFavorites();
    
    // 更新侧边栏的收藏列表
    if (sidebarRef.value) {
      sidebarRef.value.updateFavorites(favoriteItems.value);
    }
  }
};

// 从收藏中移除
const removeFromFavorites = (id) => {
  const index = favoriteItems.value.findIndex(item => item.id === id);
  if (index !== -1) {
    favoriteItems.value.splice(index, 1);
    saveFavorites();
    
    // 更新侧边栏的收藏列表
    if (sidebarRef.value) {
      sidebarRef.value.updateFavorites(favoriteItems.value);
    }
  }
};

// 切换历史记录的收藏状态（现在这个函数用于历史记录弹窗中）
const toggleFavorite = (item) => {
  // 只处理对象类型的记录
  if (typeof item !== 'object' || !item.id) return;
  
  // 检查是否已收藏
  const existingIndex = favoriteItems.value.findIndex(fav => fav.content === item.content);
  
  if (existingIndex !== -1) {
    // 如果已收藏，移除收藏
    removeFromFavorites(favoriteItems.value[existingIndex].id);
  } else {
    // 如果未收藏，添加到收藏
    addToFavorites(item);
  }
};

// 处理会话选择
const handleSelectSession = (sessionId) => {
  currentConversationId.value = sessionId;
  
  // 找到对应的会话
  const selectedConversation = conversations.value.find(c => c.id === sessionId);
  
  if (selectedConversation) {
    // 加载会话到聊天容器
    if (chatContainerRef.value) {
      chatContainerRef.value.loadConversation(selectedConversation);
    }
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

// 处理历史记录集合展示
const handleShowHistoryCollection = () => {
  // 从本地存储中读取历史记录
  let localHistoryItems = [];
  try {
    const savedHistory = localStorage.getItem('chat_history');
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory);
      if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
        // 处理历史数据，兼容旧格式（纯字符串）和新格式（对象）
        localHistoryItems = parsedHistory.map((item, index) => {
          // 如果是旧格式（纯字符串），转换为新格式并添加当前时间
          if (typeof item === 'string') {
            const now = new Date();
            const formattedTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            return {
              id: `hist-legacy-${index}`,
              time: formattedTime,
              content: item
            };
          }
          
          // 确保对象格式正确
          if (typeof item === 'object') {
            return {
              ...item,
              id: item.id || `hist-legacy-${index}`
            };
          }
          
          return item;
        });
      }
    }
  } catch (error) {
    console.error('读取历史记录失败:', error);
  }

  // 设置历史记录数据
  historyItems.value = localHistoryItems;
  // 重置搜索关键词
  searchKeyword.value = '';
  
  // 显示历史记录弹窗
  showHistoryDialog.value = true;
};

// 关闭历史记录弹窗
const closeHistoryDialog = () => {
  showHistoryDialog.value = false;
};

// 使用历史记录中的问题
const useHistoryQuestion = (question) => {
  // 确保我们获取的是问题内容，无论是旧格式还是新格式
  const content = typeof question === 'object' ? question.content : question;
  selectedHistory.value = content;
  showHistoryDialog.value = false;
};

// 显示清空历史记录确认弹窗
const showClearConfirm = () => {
  showClearConfirmDialog.value = true;
};

// 关闭清空历史记录确认弹窗
const closeClearConfirmDialog = () => {
  showClearConfirmDialog.value = false;
};

// 清空历史记录
const clearAllHistory = () => {
  try {
    // 清空历史记录
    historyItems.value = [];
    
    // 保存到本地存储
    localStorage.setItem('chat_history', JSON.stringify([]));
    
    // 关闭确认弹窗
    showClearConfirmDialog.value = false;
  } catch (error) {
    console.error('清空历史记录失败:', error);
  }
};

// 处理收藏记录集合展示
const handleShowFavorites = () => {
  // 重置搜索关键词
  favoritesSearchKeyword.value = '';
  
  // 显示收藏弹窗
  showFavoritesDialog.value = true;
};

// 关闭收藏弹窗
const closeFavoritesDialog = () => {
  showFavoritesDialog.value = false;
};

// 使用收藏中的问题
const useFavoriteQuestion = (item) => {
  selectedHistory.value = item.content;
  showFavoritesDialog.value = false;
};

// 从收藏列表中移除
const removeFavorite = (id) => {
  const index = favoriteItems.value.findIndex(item => item.id === id);
  if (index !== -1) {
    favoriteItems.value.splice(index, 1);
    saveFavorites();
    
    // 更新侧边栏的收藏列表
    if (sidebarRef.value) {
      sidebarRef.value.updateFavorites(favoriteItems.value);
    }
  }
};

// 监听聊天容器发出的收藏事件
const handleAddToFavorites = (item) => {
  if (!item || !item.content) return;
  
  // 检查是否已经收藏
  const exists = favoriteItems.value.some(fav => fav.content === item.content);
  
  if (!exists) {
    // 创建收藏对象，确保时间格式统一
    const now = new Date();
    const formattedTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const favoriteItem = {
      id: `fav-${Date.now()}`,
      time: formattedTime,
      content: item.content
    };
    
    // 添加到收藏列表
    favoriteItems.value.unshift(favoriteItem);
    
    // 保存收藏
    saveFavorites();
    
    // 更新侧边栏的收藏列表
    if (sidebarRef.value) {
      sidebarRef.value.updateFavorites(favoriteItems.value);
    }
    
    // 显示成功提示
    showMessage('收藏成功');
  } else {
    // 已经收藏过，显示提示
    showMessage('该内容已收藏');
  }
};

// 添加消息提示功能
const messageTimeout = ref(null);
const messageVisible = ref(false);
const messageText = ref('');

const showMessage = (text, duration = 2000) => {
  // 清除之前的定时器
  if (messageTimeout.value) {
    clearTimeout(messageTimeout.value);
  }
  
  // 设置消息内容和显示状态
  messageText.value = text;
  messageVisible.value = true;
  
  // 设定隐藏定时器
  messageTimeout.value = setTimeout(() => {
    messageVisible.value = false;
  }, duration);
};
</script>

<template>
  <div class="container">
    <Sidebar 
      ref="sidebarRef" 
      @select-chat="handleSelectChat" 
      @select-history="handleSelectHistory"
      @select-favorite="handleSelectFavorite" 
      @select-session="handleSelectSession"
      @show-history-collection="handleShowHistoryCollection"
      @show-favorites="handleShowFavorites" 
    />
    <main class="main-content">
      <ChatContainer 
        ref="chatContainerRef"
        :selectedHistory="selectedHistory" 
        @add-history="handleAddHistory" 
        @save-conversation="handleSaveConversation"
        :conversationId="currentConversationId"
        @add-to-favorites="handleAddToFavorites"
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
    
    <!-- 历史记录弹窗 -->
    <div class="dialog-overlay" v-if="showHistoryDialog">
      <div class="dialog-content history-dialog">
        <div class="dialog-header">
          <i class="fas fa-history"></i>
          <h3>历史记录</h3>
          <button @click="closeHistoryDialog" class="close-button">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="dialog-body">
          <div class="search-box">
            <div class="search-input-container">
              <i class="fas fa-search search-icon"></i>
              <input 
                type="text" 
                v-model="searchKeyword" 
                placeholder="搜索历史记录..." 
                class="search-input"
              />
              <i 
                v-if="searchKeyword" 
                class="fas fa-times clear-search" 
                @click="searchKeyword = ''"
              ></i>
            </div>
            <button @click="showClearConfirm" class="clear-history-button">
              <i class="fas fa-trash-alt"></i>
              清空记录
            </button>
          </div>
          
          <div v-if="filteredHistoryItems.length > 0" class="history-list-dialog">
            <div 
              v-for="(item, index) in filteredHistoryItems" 
              :key="typeof item === 'object' ? item.id : index" 
              class="history-item-dialog"
              @click.stop="useHistoryQuestion(typeof item === 'object' ? item.content : item)"
            >
              <!-- 序号 -->
              <div class="history-item-number">{{ historyItems.length - index }}</div>
              
              <div class="history-item-content">
                <div class="history-time" v-if="typeof item === 'object' && item.time">{{ item.time }}</div>
                <div class="history-text" v-if="!searchKeyword">{{ typeof item === 'object' ? item.content : item }}</div>
                <div 
                  class="history-text" 
                  v-else 
                  v-html="highlightMatchedText(typeof item === 'object' ? item.content : item, searchKeyword)"
                ></div>
              </div>
              
              <!-- 收藏按钮 -->
              <button 
                v-if="typeof item === 'object'"
                class="favorite-button" 
                :class="{ active: favoriteItems.some(fav => fav.content === item.content) }"
                @click.stop="toggleFavorite(item)"
                :title="favoriteItems.some(fav => fav.content === item.content) ? '取消收藏' : '收藏'"
              >
                {{ favoriteItems.some(fav => fav.content === item.content) ? '★' : '☆' }}
              </button>
            </div>
          </div>
          <div v-else-if="searchKeyword && historyItems.length > 0" class="empty-history">
            <i class="fas fa-search"></i>
            <span>未找到匹配的历史记录</span>
          </div>
          <div v-else class="empty-history">
            <i class="fas fa-info-circle"></i>
            <span>暂无历史记录</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 收藏弹窗 -->
    <div class="dialog-overlay" v-if="showFavoritesDialog">
      <div class="dialog-content history-dialog">
        <div class="dialog-header">
          <i class="fas fa-star"></i>
          <h3>我的收藏</h3>
          <button @click="closeFavoritesDialog" class="close-button">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="dialog-body">
          <div class="search-box">
            <div class="search-input-container">
              <i class="fas fa-search search-icon"></i>
              <input 
                type="text" 
                v-model="favoritesSearchKeyword" 
                placeholder="搜索收藏记录..." 
                class="search-input"
              />
              <i 
                v-if="favoritesSearchKeyword" 
                class="fas fa-times clear-search" 
                @click="favoritesSearchKeyword = ''"
              ></i>
            </div>
          </div>
          
          <div v-if="filteredFavoriteItems.length > 0" class="history-list-dialog">
            <div 
              v-for="(item, index) in filteredFavoriteItems" 
              :key="item.id" 
              class="history-item-dialog"
            >
              <!-- 序号 -->
              <div class="history-item-number">{{ favoriteItems.length - index }}</div>
              
              <!-- 内容区域，点击使用该问题 -->
              <div class="history-item-content" @click.stop="useFavoriteQuestion(item)">
                <div class="history-time" v-if="item.time">{{ item.time }}</div>
                <div class="history-text" v-if="!favoritesSearchKeyword">{{ item.content }}</div>
                <div 
                  class="history-text" 
                  v-else 
                  v-html="highlightMatchedText(item.content, favoritesSearchKeyword)"
                ></div>
              </div>
              
              <!-- 删除按钮，使用独立的样式 -->
              <button 
                class="delete-favorite-btn" 
                @click.stop="removeFavorite(item.id)"
                title="删除"
              >
                删除
              </button>
            </div>
          </div>
          <div v-else class="empty-history">
            <i class="fas fa-star"></i>
            <span>暂无收藏记录</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 确认清空历史记录弹窗 -->
    <div class="dialog-overlay" v-if="showClearConfirmDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>确认清空</h3>
        </div>
        <div class="dialog-body">
          <p>确定要清空所有历史记录吗？此操作不可恢复。</p>
        </div>
        <div class="dialog-footer">
          <button @click="closeClearConfirmDialog" class="dialog-button cancel-button">取消</button>
          <button @click="clearAllHistory" class="dialog-button confirm-button">确定清空</button>
        </div>
      </div>
    </div>

    <!-- 消息提示组件 -->
    <div v-if="messageVisible" class="message-toast">
      {{ messageText }}
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
  position: relative;
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
  gap: 10px;
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

/* 历史记录弹窗样式 */
.history-dialog {
  width: 500px;
  max-width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.close-button {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.history-list-dialog {
  max-height: 60vh;
  overflow-y: auto;
}

.history-item-dialog {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  padding-left: 40px; /* 为序号留出空间 */
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.history-item-dialog:hover {
  background-color: #f1f5f9;
}

.history-item-dialog:last-child {
  border-bottom: none;
}

.history-item-number {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
  width: 24px;
  text-align: center;
}

.history-item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-time {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.history-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item-dialog i {
  color: #64748b;
  flex-shrink: 0;
  margin-top: 4px;
}

.favorite-button {
  background: transparent;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  font-size: 18px;
  padding: 4px 8px;
  transition: all 0.2s ease;
  line-height: 1;
}

.favorite-button:hover {
  color: #eab308;
}

.favorite-button.active {
  color: #eab308;
}

.empty-history {
  padding: 24px;
  text-align: center;
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-history i {
  font-size: 24px;
  margin-bottom: 8px;
}

/* 搜索框和清空按钮样式 */
.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.search-input-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: #94a3b8;
  font-size: 14px;
}

.search-input {
  width: 100%;
  padding: 8px 30px 8px 35px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.clear-search {
  position: absolute;
  right: 10px;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
}

.clear-history-button {
  padding: 8px 12px;
  background: #f1f5f9;
  color: #64748b;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;
}

.clear-history-button:hover {
  background: #e2e8f0;
  color: #334155;
}

.clear-history-button i {
  font-size: 12px;
}

/* 确认弹窗样式 */
.cancel-button {
  background: #f1f5f9;
  color: #334155;
  transition: all 0.2s ease;
}

.cancel-button:hover {
  background: #e2e8f0;
}

.confirm-button {
  background: #ef4444;
  transition: all 0.2s ease;
}

.confirm-button:hover {
  background: #dc2626;
}

/* 高亮关键词样式 */
:deep(.highlight-keyword) {
  background-color: #fef08a;
  border-radius: 2px;
  padding: 0 2px;
  font-weight: 500;
}

/* 收藏项操作按钮样式 - 重新命名以避免与之前的样式冲突 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  flex-shrink: 0;
}

.favorite-button {
  background: transparent;
  border: none;
  color: #eab308; /* 始终使用黄色，因为收藏列表中的项目都是已收藏的 */
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  transition: all 0.2s ease;
  line-height: 1;
}

.delete-button {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  transition: all 0.2s ease;
  line-height: 1;
}

.delete-button:hover {
  transform: scale(1.1);
}

/* 删除按钮样式 */
.delete-favorite-btn {
  background-color: #f87171;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 8px;
  line-height: 1.5;
  font-weight: 500;
}

.delete-favorite-btn:hover {
  background-color: #ef4444;
}

/* 消息提示样式 */
.message-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
  z-index: 9999;
  animation: fadeInOut 2s ease;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; }
}
</style>
