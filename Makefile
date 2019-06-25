PORT?=8082
APP=dtv3

.PHONY: help
help:
	@echo "Installation script"
	@echo "make help   : Show this info"
	@echo "make start  : Build Dashticz container and start it on port 8082"
	@echo "              Parameters: "
	@echo "              PORT=<port> : Build Dashticz container and start in on the provided port"
	@echo "make stop    : Stop the Domoticz container"
	@echo
	@echo "make update  : Update Dashticz to the latest version from Github"
	@echo "make beta    : Switch to the beta branch"
	@echo "make master  : Switch to the master branch"

testdocker:
ifeq (, $(shell which docker))
	@echo "Let's install docker first"
	wget -qO- https://get.docker.com/ | sh	
endif
ifeq (true, $(shell sudo docker inspect -f '{{.State.Running}}' dtv2 2>/dev/null))
	@echo "$(APP) is running already. Let's stop it first"
	make stop
endif

testgit:
	@echo "Check for git"
ifeq (, $(shell which git))
	@echo "Installing git ..."
	sudo apt-get install git
else
	@echo "Installed..."	
endif

.PHONY: start
start: testdocker testgit
	sudo docker build -t $(APP) .
	sudo docker run --name $(APP) -d -p $(PORT):80 --mount type=bind,source="$(CURDIR)",target=/var/www/html $(APP)
	@echo "Dashticz is running at:"
	@printf "http://%s:$(PORT)\n" `hostname -I | grep -Po '\b(?:\d{1,3}\.){3}\d{1,3}\b'`
  
.PHONY: stop
stop:
	sudo docker stop $(APP)
	sudo docker rm $(APP)

.PHONY: dockerinstall
dockerinstall:
	echo installing docker
	sudo apt-get install docker.io

.PHONY: logs
logs:
	sudo docker container logs $(APP)
 
.PHONY: login
login:
	sudo docker exec -it $(APP) bash
 
.PHONY: status
status:
	sudo docker ps -f name=$(APP)

.PHONY: update
update:
	git pull

.PHONY: master
master:
	git checkout master

.PHONY: beta
beta:
	git checkout master
