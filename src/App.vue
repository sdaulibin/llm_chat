<script setup>
import { ref } from 'vue';
import Sidebar from './components/Sidebar.vue';
import ChatContainer from './components/ChatContainer.vue';
import QingdaoBankLogo from './assets/qingdao-bank.ico';

// 用于存储当前选中的历史记录项目
const selectedHistory = ref('');
// 侧边栏组件引用
const sidebarRef = ref(null);

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
</script>

<template>
  <div class="container">
    <Sidebar ref="sidebarRef" @select-history="handleSelectHistory" />
    <main class="main-content">
      <header class="header">
        <img :src="QingdaoBankLogo" alt="青岛银行" class="logo" />
        <h1>智能办公助手</h1>
      </header>
      <ChatContainer 
        :selectedHistory="selectedHistory" 
        @add-history="handleAddHistory" 
      />
    </main>
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

.header {
  padding: 20px;
  border-bottom: 1px solid #e6e8eb;
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
}

.header h1 {
  font-size: 20px;
  color: #1e3a8a;
  font-weight: 600;
}

.logo {
  width: 24px;
  height: 24px;
}
</style>
