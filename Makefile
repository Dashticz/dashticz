-include Makefile.ini
PORT?=8082
APP?=dtv3-$(PORT)
# Try to get timezone, fallback to Europe/Amsterdam if not available
TZ?=$(shell if [ -f /etc/timezone ]; then cat /etc/timezone; elif [ -f /etc/localtime ]; then readlink /etc/localtime | sed 's|.*/zoneinfo/||'; else echo "Europe/Amsterdam"; fi)
CHECKDOCKER?=true
# Cross-platform disk space check (works on both Linux and macOS)
FREE = $(shell if command -v df >/dev/null 2>&1 && df --version 2>&1 | grep -q GNU; then df -k --output=avail . | tail -n1; else df -k . | tail -n1 | awk '{print $$4}'; fi)
DOCKERIMAGE = "php:8.3-fpm-alpine"

.PHONY: help
help:
	@echo "Installation script"
	@echo "make help          : Show this info"
	@echo "make start         : Build Dashticz container and start it on port 8082"
	@echo "                     Parameters: "
	@echo "                     PORT=<port> : Build Dashticz container and start in on the provided port"
	@echo "make stop          : Stop the Dashticz container"
	@echo "make rebuild       : Stop existing container and rebuild/start it"
	@echo
	@echo "make update        : Update Dashticz to the latest version from Github"
	@echo "make beta          : Switch to the beta branch"
	@echo "make master        : Switch to the master branch"
	@echo
	@echo "make upgradeimage  : Upgrade Docker image to latest version"
	@echo "make upgradesystem : Update and upgrade OS"
	@echo "make fullupgrade   : Update and upgrade OS, including Docker image update"
	

testdocker:
ifeq ($(CHECKDOCKER),true)
ifeq (, $(shell which docker))
	@echo "Let's install docker first"
	sudo apt update --allow-releaseinfo-change
	wget -qO- https://get.docker.com/ | sh	
endif
endif


testgit:
ifeq (, $(shell which git))
	@echo "Installing git ..."
	sudo apt-get install git
endif

# Port check removed - Docker will handle port conflicts and provide clear error messages
testport:
	@echo "Port check skipped - Docker will handle port conflicts"

.PHONY: start
start: testdocker testgit testport
	@echo "Checking container $(APP)"
ifeq ($(shell sudo docker ps -q -a -f NAME=$(APP) ),)
	sudo docker build --build-arg tz=$(TZ) -t $(APP) .
	sudo docker run  --restart unless-stopped -v /etc/localtime:/etc/localtime:ro  --name $(APP) -d -p $(PORT):80 --mount type=bind,source="$(CURDIR)",target=/var/www/html $(APP) || (echo "Failed to start container. Port may be in use or container name conflict." && exit 1)
	@echo
	@echo "Dashticz is running at:"
	@echo "http://localhost:$(PORT)"
	@if command -v hostname >/dev/null 2>&1 && hostname -I >/dev/null 2>&1; then \
		printf "http://%s:$(PORT)\n" `hostname -I | head -n1 | awk '{print $$1}'`; \
	elif command -v ipconfig >/dev/null 2>&1; then \
		printf "http://%s:$(PORT)\n" `ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost"`; \
	fi
else
	@echo
	@echo "The Docker container $(APP) for Dashticz already exists"
	@echo "If you want to rebuild run the following command first: make stop"
	@echo "or edit Makefile.ini with a new name for APP and retry via: make start"
	@echo
endif

  
.PHONY: stop
stop:
	@echo "Cleaning up $(APP)"
ifeq ($(shell sudo docker ps -q -a -f NAME=$(APP) ),)
#container doesn exist
	@echo "Container $(APP) non existing"
else
	@echo "Container $(APP) exists"
ifeq (true, $(shell sudo docker inspect -f '{{.State.Running}}' $(APP) 2>/dev/null))
#container is running
	sudo docker stop $(APP)
endif
	sudo docker rm $(APP)
endif

.PHONY: rebuild
rebuild: stop start


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

.PHONY: fullupgrade
fullupgrade: fullclean testdiskspace upgradesystem upgradeimage dockerprune

.PHONY: testdiskspace
testdiskspace:
	@echo "Checking for sufficient diskspace (500MB)"
#ifeq ($(shell ss -ln src :$(PORT) | grep -Ec -e "\<$(PORT)\>"),0)
#	@echo "Insufficient disk space."
#	@exit 201
#endif
	
# @echo $(shell echo $(FREE))
ifeq ($(shell test $(FREE) -lt 400000; echo $$?),0)
	@echo "Less than 400MBs free disk space!"
	@exit 201
endif 

.PHONY: upgradesystem
upgradesystem:
	sudo apt-get -y update
	sudo apt-get -y upgrade

.PHONY: fullupgradesystem
fullupgradesystem:
	sudo apt-get -y --allow-releaseinfo-change update
	sudo apt-get -y upgrade

.PHONY: upgradeimage
upgradeimage: stop pullimage
	make start

.PHONY: pullimage
pullimage:
	sudo docker pull $(DOCKERIMAGE)

.PHONY: fullclean
fullclean: aptclean dockerprune

.PHONY: dockerprune
dockerprune:
	@sudo docker image prune -af

.PHONE: aptclean
aptclean:
	@sudo apt-get clean
	@sudo apt-get autoclean
	