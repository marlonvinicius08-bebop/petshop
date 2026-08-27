FROM nginxinc/nginx-unprivileged:1.27-alpine
ARG WEB_APP
COPY infra/web/default.conf /etc/nginx/conf.d/default.conf
COPY apps/shared/ /usr/share/nginx/html/assets/
COPY apps/${WEB_APP}/ /usr/share/nginx/html/
EXPOSE 8080
