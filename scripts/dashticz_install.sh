#!/bin/bash
# Dashticz Installation script
#
#Execute this script via:
# . <(wget -qO - https://raw.githubusercontent.com/Dashticz/dashticz/beta/scripts/dashticz_install.sh )

REPOSITORY="https://github.com/Dashticz/dashticz"
PORT=8082
BRANCH=master
SETTINGSFILE="./dashticz_install.ini"
DEFAULTFOLDER="dashticz"

echo This is the installation script for Dashticz
echo

if [[ -f "$SETTINGSFILE" ]]; then
    echo "Using settings from $SETTINGSFILE"
    . "$SETTINGSFILE" 
else
    echo "Using default settings"
fi


echo
echo "Dashticz repository: $REPOSITORY"
echo "Branch: $BRANCH"
echo "Port: $PORT"
echo

retry=true

while "$retry"; do
    echo The script will create a folder for Dashticz in the following location:
    echo `pwd`
    echo
    read -p "Enter the folder name [$DEFAULTFOLDER]: " NAME
    NAME=${NAME:-$DEFAULTFOLDER}
    echo
    echo Dashticz will be installed in
    echo $NAME
    echo
    retry=false
    if [ -d "$NAME" ]; then
        echo "*** ERROR ***"
        echo This folder already exists.
        echo Provide a new folder name to install Dashticz
        echo If you want to update Dashticz, cancel the install and run the following commands:
        echo
        echo "cd $NAME && make update"
        echo
        retry=true
    fi
done
retry=true
while "$retry"; do
    echo
    echo "Dashticz has a master branch (=stable) and a beta branch (=most up-to-date)"
    read -p "Which branch to install? [$BRANCH]: " MYBRANCH
    BRANCH=${MYBRANCH:-$BRANCH}
    retry=false
#    if ! [[ "$BRANCH" =~ ^(master|beta)$ ]]; then
#        echo Please enter master or beta
#        retry=true
#    fi
done
echo
echo "Now cloning the Dashticz repository $REPOSITORY"
echo 
git clone "$REPOSITORY" -b "$BRANCH" "$NAME" || ( echo Error. Something went wrong. Exiting; exit 1 )
echo
cd "$NAME"
chmod a+rX .

#Checking whether make is installed
printf "Checking for make: "
if [ $(dpkg-query -W -f='${Status}' make 2>/dev/null | grep -c "ok installed") -eq 0 ];
then
  echo "Ïnstalling ..."
  sudo apt-get install make || ( echo Error. Something went wrong. Exiting; exit 1 ) ; 
else
    echo "[OK!]"
fi

echo "Configuring Dashticz."
echo
read -p "What is the IP:port address of your Domoticz server? (example: 192.168.178.18:8080): " domip
domip=${domip:-192.168.178.18:8080}
echo
cd custom
cp CONFIG_DEFAULT.js CONFIG.js
sed -i "s/192.168.1.3:8084/$domip/g" CONFIG.js
cd ..

echo "Finding a free port for Dashticz"
retry=true
while "$retry"; do
    # count the number of occurrences of port $myport in output: 1= in use; 0 = not in use
    result=$(ss -ln src :$PORT | grep -Ec -e "\<$PORT\>")
    if [ "$result" -eq 1 ]; then
        echo "Port $PORT is in use"
        PORT=$((PORT + 1))
    else
        echo "Port $PORT is available"
        retry=false
    fi
done
echo
echo "Setting up Dashticz on port $PORT"
echo

#creating Makefile.ini
touch Makefile.ini

echo "APP=dtv3-$PORT" >> Makefile.ini
echo "PORT=$PORT" >> Makefile.ini

echo
echo "Starting make process ..."
echo
make start || ( echo "Error during Make. Exiting"; exit 1 )
echo

statusok=true
printf "Trying Domoticz IP..."
reply=`wget -q -T 3 -t 1 --spider --server-response "$domip" 2>&1 | awk '/^  HTTP/{print $2}'`

if [[ "$reply" != 200 ]]; then
    echo "Domoticz IP is not correct: no valid reply" 
    statusok=false
fi
if [ "$statusok" == true ]; then
    reply=`wget -q -T 3 -t 1 --spider --server-response "$domip"'/json.htm?type=command&param=getversion' 2>&1 | awk '/^  HTTP/{print $2}'`
#    echo "$reply"
    if [[ "$reply" != 200 ]]; then
        echo "Domoticz IP is not correct: no valid reply" 
        statusok=false
    fi
fi
if [ "$statusok" == true ]; then
    reply=`wget -q -O - -T 3 -t 1 "$domip"'/json.htm?type=command&param=getversion' | grep -Po '"status".*\K".*"'`
    if [[ "$reply" != '"OK"' ]]; then
        echo "Domoticz status reply is not correct: no valid reply" 
        statusok=false
    fi
fi
if [ "$statusok" == true ]; then
    echo "OK!"
else
    echo "Domoticz is not responding correctly"
    echo "Please check custom/CONFIG.js."
    echo "You might have to correct the Domoticz IP address or to configure the Domoticz username and/or password."
fi

echo "All done."
echo
echo "Visit the following link for information how to configure your Dashticz dashboard:"
echo "https://dashticz.readthedocs.io/en/latest/gettingstarted/basicdashboard.html#step-2-creating-a-custom-layout"
echo



