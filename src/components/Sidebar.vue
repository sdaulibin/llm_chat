<script setup>
import { ref, defineEmits, onMounted } from 'vue';

// 定义事件
const emit = defineEmits(['select-history']);

// 侧边栏组件，用于显示历史记录
const historyItems = ref([
  '如何处理客户投诉？',
  '贷款审批流程是什么？',
  '如何进行风险评估？'
]);

// 控制侧边栏折叠状态
const isCollapsed = ref(false);

// 选择历史记录项目
const selectHistoryItem = (item) => {
  emit('select-history', item);
};

// 切换侧边栏折叠状态
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};

// 从本地存储加载历史记录
onMounted(() => {
  try {
    const savedHistory = localStorage.getItem('chat_history');
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory);
      if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
        historyItems.value = parsedHistory;
      }
    }
  } catch (error) {
    console.error('加载历史记录失败:', error);
  }
});

// 添加新的历史记录
const addHistoryItem = (item) => {
  // 避免重复添加
  if (!historyItems.value.includes(item)) {
    // 添加到历史记录开头
    historyItems.value.unshift(item);
    
    // 限制历史记录数量
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

// 暴露方法给父组件
defineExpose({
  addHistoryItem
});
</script>

<template>
  <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">
    <div class="toggle-button" @click="toggleSidebar">
      <i :class="['fas', isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left']"></i>
    </div>
    <div class="sidebar-content">
      <div class="sidebar-header">
        <i class="fas fa-comment-dots sidebar-icon"></i>
        <h2 v-if="!isCollapsed">历史记录</h2>
      </div>
      <div class="history-section">
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
  padding: 20px 0;
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
  padding: 0 20px;
  height: 100%;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 10px;
}

.sidebar-icon {
  font-size: 20px;
  color: #1e3a8a;
}

.sidebar.collapsed {
  width: 70px;
  padding: 20px 0;
}

.sidebar.collapsed .sidebar-content {
  padding: 0 10px;
  align-items: center;
}

.sidebar.collapsed .history-item {
  justify-content: center;
  padding: 12px 0;
  width: 40px;
  height: 40px;
}

.sidebar.collapsed .history-item i {
  margin-right: 0;
  font-size: 18px;
}

.sidebar.collapsed .no-history {
  justify-content: center;
}

.toggle-button {
  position: absolute;
  right: -12px;
  bottom: 20px;
  width: 24px;
  height: 24px;
  background: #1e3a8a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  z-index: 1;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.toggle-button:hover {
  background: #1e40af;
}

.history-section {
  flex: 1;
  overflow-y: auto;
}

.sidebar-header h2 {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
}

.history-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.history-item:hover {
  background: #f1f5f9;
}

.history-item i {
  color: #64748b;
}

.no-history {
  padding: 12px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 8px;
  font-style: italic;
}
</style>