# node-discordbot
This is a bot for the discord communication tool.


TODO
----


DOCKER
------

Build the docker container:
sudo docker build -t "node-discordbot" .

sudo docker ps -a | awk '{ print $1,$2 }' | grep IMAGENAME | awk '{print $1 }' | xargs -I {} sudo docker rm {}

Remove all docker containers of the specified image

sudo docker ps -a | awk '{ print $1,$2 }' | grep IMAGENAME | awk '{print $1 }' | xargs -I {} sudo docker rm {}
Source: http://linuxconfig.org/remove-all-containners-based-on-docker-image-name
