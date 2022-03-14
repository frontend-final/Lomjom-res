FROM nginx:latest

COPY ./web2/Lesson1 /usr/share/nginx/html 

EXPOSE 80