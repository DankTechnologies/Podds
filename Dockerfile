# Build stage
FROM node:22-alpine as builder

WORKDIR /app

# Install pnpm using npm instead of corepack
RUN npm install -g pnpm@latest

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN pnpm build

# Serve stage
FROM nginx:alpine

# Copy the built assets from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Configure nginx to serve on port 4416
RUN echo 'server { \
    listen 4416; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 4416
EXPOSE 4416

CMD ["nginx", "-g", "daemon off;"] 