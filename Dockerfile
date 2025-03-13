# 第一阶段：构建前端应用
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 第二阶段：配置OpenResty
FROM openresty/openresty:alpine

# 复制前端构建产物
COPY --from=builder /app/dist /usr/local/openresty/nginx/html/
# 复制Nginx配置文件
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf

EXPOSE 80

CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]