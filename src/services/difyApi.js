/**
 * Dify API 服务
 * 提供与Dify对话型应用API的交互功能
 */

// API基础URL
const API_BASE_URL = 'http://localhost/v1';

// 存储API密钥
let apiKey = '';

/**
 * 设置API密钥
 * @param {string} key - Dify API密钥
 */
export const setApiKey = (key) => {
  apiKey = key;
};

/**
 * 发送聊天消息
 * @param {string} query - 用户输入/提问内容
 * @param {object} inputs - 应用定义的变量值
 * @param {string} conversationId - 会话ID，用于继续之前的对话
 * @param {string} user - 用户标识
 * @param {boolean} streaming - 是否使用流式响应
 * @param {array} files - 要随消息一起发送的文件数组，格式为[{type, transfer_method, url}]
 * @returns {Promise} - 返回响应Promise
 */
export const sendChatMessage = async ({
  query,
  inputs = {},
  conversationId = '',
  user = 'default_user',
  streaming = true,
  files = []
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        inputs,
        user,
        conversation_id: conversationId,
        response_mode: streaming ? 'streaming' : 'blocking',
        files
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '请求失败');
    }

    if (streaming) {
      // 返回响应对象，用于处理流式数据
      return response;
    } else {
      // 返回完整响应数据
      return await response.json();
    }
  } catch (error) {
    console.error('发送消息失败:', error);
    // 提供更具体的错误信息
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('网络连接错误，请检查您的网络连接');
    } else if (error.message && error.message.includes('API key')) {
      throw new Error('API密钥无效或未正确设置，请检查您的API密钥');
    } else if (!apiKey) {
      throw new Error('API密钥未设置，请先设置API密钥');
    } else {
      throw new Error(error.message || '发送消息时出现错误，请稍后重试');
    }
  }
};

/**
 * 处理流式响应
 * @param {Response} response - fetch API的响应对象
 * @param {Function} onMessage - 接收消息的回调函数
 * @param {Function} onError - 错误处理回调函数
 * @param {Function} onEnd - 结束时的回调函数
 */
export const handleStreamResponse = async (response, {
  onMessage,
  onError,
  onEnd
}) => {
  // 创建一个AbortController用于中断流式响应
  const controller = new AbortController();
  const signal = controller.signal;
  
  // 将controller暴露到全局，以便stopChatMessage可以中断流式响应
  window._streamController = controller;
  
  try {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      // 检查是否已被中断
      if (signal.aborted) {
        console.log('流式响应已被中断');
        break;
      }
      
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // 处理接收到的数据块
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // 保留最后一个可能不完整的块
      
      for (const line of lines) {
        // 再次检查是否已被中断
        if (signal.aborted) break;
        
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            
            // 根据事件类型处理数据
            switch (data.event) {
              case 'message':
                onMessage && onMessage({
                  type: 'message',
                  content: data.answer,
                  messageId: data.message_id,
                  conversationId: data.conversation_id
                });
                break;
              case 'message_end':
                onEnd && onEnd({
                  messageId: data.message_id,
                  conversationId: data.conversation_id,
                  metadata: data.metadata
                });
                // 清理controller
                delete window._streamController;
                break;
              case 'error':
                onError && onError({
                  message: data.message,
                  code: data.code
                });
                break;
            }
          } catch (e) {
            console.error('解析流数据失败:', e);
          }
        }
      }
    }
    
    // 如果是因为中断而退出循环，调用onEnd回调
    if (signal.aborted) {
      onEnd && onEnd({
        aborted: true
      });
      // 清理controller
      delete window._streamController;
    }
  } catch (error) {
    // 提供更详细的流数据错误信息
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      onError && onError({ message: '网络连接中断，请检查您的网络连接', error });
    } else {
      onError && onError({ message: '读取流数据失败', error });
    }
    // 清理controller
    delete window._streamController;
  }
};

/**
 * 上传文件
 * @param {File} file - 要上传的文件
 * @param {string} user - 用户标识
 * @returns {Promise} - 返回上传结果Promise
 */
export const uploadFile = async (file, user = 'default_user') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user', user);

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '上传文件失败');
    }

    return await response.json();
  } catch (error) {
    console.error('上传文件失败:', error);
    // 提供更具体的文件上传错误信息
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('网络连接错误，无法上传文件');
    } else if (error.message && error.message.includes('API key')) {
      throw new Error('API密钥无效或未正确设置，请检查您的API密钥');
    } else if (!apiKey) {
      throw new Error('API密钥未设置，请先设置API密钥');
    } else {
      throw new Error(error.message || '上传文件时出现错误，请稍后重试');
    }
  }
};

/**
 * 停止响应
 * @param {string} taskId - 任务ID，可在流式返回Chunk中获取
 * @param {string} user - 用户标识，必须和发送消息接口传入user保持一致
 * @returns {Promise} - 返回停止结果Promise
 */
export const stopChatMessage = async (taskId, user = 'default_user') => {
  try {
    // 首先中断当前的流式响应（如果存在）
    if (window._streamController) {
      window._streamController.abort();
      console.log('已中断流式响应');
    }
    
    // 然后向服务器发送停止请求
    const response = await fetch(`${API_BASE_URL}/chat-messages/${taskId}/stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '停止响应失败');
    }

    return await response.json();
  } catch (error) {
    console.error('停止响应失败:', error);
    // 提供更具体的错误信息
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('网络连接错误，请检查您的网络连接');
    } else if (error.message && error.message.includes('API key')) {
      throw new Error('API密钥无效或未正确设置，请检查您的API密钥');
    } else if (!apiKey) {
      throw new Error('API密钥未设置，请先设置API密钥');
    } else {
      throw new Error(error.message || '停止响应时出现错误，请稍后重试');
    }
  }
};

/**
 * 获取下一轮建议问题列表
 * @param {string} messageId - 消息ID
 * @param {string} user - 用户标识
 * @returns {Promise} - 返回建议问题列表Promise
 */
export const getSuggestedQuestions = async (messageId, user = 'default_user') => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}/suggested?user=${user}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '获取建议问题失败');
    }

    return await response.json();
  } catch (error) {
    console.error('获取建议问题失败:', error);
    // 提供更具体的错误信息
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('网络连接错误，请检查您的网络连接');
    } else if (error.message && error.message.includes('API key')) {
      throw new Error('API密钥无效或未正确设置，请检查您的API密钥');
    } else if (!apiKey) {
      throw new Error('API密钥未设置，请先设置API密钥');
    } else {
      throw new Error(error.message || '获取建议问题时出现错误，请稍后重试');
    }
  }
};

export default {
  setApiKey,
  sendChatMessage,
  handleStreamResponse,
  uploadFile,
  stopChatMessage,
  getSuggestedQuestions
};