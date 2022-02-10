-include Makefile.ini
PORT?=8082
APP?=dtv3-$(PORT)
TZ?="$(shell cat /etc/timezone)"
CHECKDOCKER?=true
FREE = "$(shell df -k --output=avail . | tail -n1)"
DOCKERIMAGE = "php:7.4-apache"

.PHONY: help
help:
	@echo "Installation script"
	@echo "make help          : Show this info"
	@echo "make start         : Build Dashticz container and start it on port 8082"
	@echo "                     Parameters: "
	@echo "                     PORT=<port> : Build Dashticz container and start in on the provided port"
	@echo "make stop          : Stop the Domoticz container"
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

testport:
ifeq ($(shell ss -ln src :$(PORT) | grep -Ec -e "\<$(PORT)\>"),0)
else
	@echo
	@echo "PORT is defined in Makefile.ini as $(PORT)"
	@echo "This port already is in use"
	@echo "Please use a different port."
	@echo "Then restart via: make start"
	@echo
	@exit 201
endif

.PHONY: start
start: testdocker testgit
	@echo "Checking container $(APP)"
ifeq ($(shell sudo docker ps -q -a -f NAME=$(APP) ),)
	@echo "Checking port $(PORT)"

ifeq ($(shell ss -ln src :$(PORT) | grep -Ec -e "\<$(PORT)\>"),0)
	sudo docker build --build-arg tz=$(TZ) -t $(APP) .
	sudo docker run  --restart unless-stopped -v /etc/localtime:/etc/localtime:ro  --name $(APP) -d -p $(PORT):80 --mount type=bind,source="$(CURDIR)",target=/var/www/html $(APP)
	@echo
	@echo "Dashticz is running at:"
	@printf "http://%s:`sudo docker inspect -f '{{ (index (index .NetworkSettings.Ports "80/tcp") 0).HostPort }}' $(APP)`\n" `hostname -I | grep -Po '\b(?:\d{1,3}\.){3}\d{1,3}\b'` 
else
	@echo
	@echo "Port $(PORT) already is in use."
	@echo "If you want to rebuild run the following command first: make stop"
	@echo "or edit Makefile.ini with a new port and retry via: make start"
	@echo

endif
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
	