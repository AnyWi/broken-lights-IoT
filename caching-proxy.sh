#!/bin/sh -x
#
# Quick to implement caching 'proxy' in shell, for use of downloading entries
# which are for example protected and/or requires extra steps to download.
#
# Rick van der Zwet <rick.vanderzwet@anywi.com>
#

if [ -z "$SOCAT_SOCKPORT" ]; then
	exec socat TCP4-LISTEN:4000,fork,reuseaddr EXEC:$0
fi

WORKDIR=$(mktemp -d)
trap "rm -R $WORKDIR" EXIT
HEADERFILE=$WORKDIR/header.txt

sed -e '/^\r$/q' -e '/^$/q' > $HEADERFILE
URI=$(awk '/^GET/ {print $2}' $HEADERFILE)

if echo $URI | grep -q 'objects.php'; then
	CONTENT_TYPE="application/json"
else
	CONTENT_TYPE="image/png"
fi

cat <<EOF
HTTP/1.1 200 OK
Cache-Control: no-store, no-cache, must-revalidate
Expires: Thu, 19 Nov 1981 08:52:00 GMT
Pragma: no-cache
Content-Type: $CONTENT_TYPE
Access-Control-Allow-Origin: *

EOF


# echo '=== START ENVIRONMENT ==='
# env 
# echo '=== END ENVIRONMENT ==='

# echo '=== START HEADER ==='
# cat /tmp/header.txt
# echo '=== END HEADER ==='

CACHEFILE=$WORKDIR/cachefile
CACHE_URI=/tmp/cache/$(echo $URI | sha256sum | awk '{print $1}' | sed -E 's+^([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})+\1/\2/\3/+g')
if [ ! -d $(dirname $CACHE_URI) ]; then
	mkdir -p $(dirname $CACHE_URI)
fi

if [ -r $CACHE_URI ]; then
	cat $CACHE_URI
else
  if echo $URI | grep -q -e 'objects.php' -e 'tiles.php'; then
     # Quick to download entries from moononline.nl which requires cookie to be present
     curl -I -s -b /tmp/cookies.txt -c /tmp/cookies.txt "https://storing.moononline.nl/gemeenteleiden" > /dev/null
     curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt "https://storing.moononline.nl$URI" > $CACHEFILE
     if [ $? -eq 0 ]; then
  	mv $CACHEFILE $CACHE_URI	
  	cat $CACHE_URI
     fi
  elif echo $URI | grep -q -E '/[0-9]+/[0-9]+/[0-9]+.png$'; then
     # Openstreetmap caching
     curl -s "https://$(shuf -i 0-2 -n 1 | tr -t '012' 'abc').tile.openstreetmap.org$URI" > $CACHEFILE
     if [ $? -eq 0 ]; then
  	mv $CACHEFILE $CACHE_URI	
  	cat $CACHE_URI
     fi
  fi
fi
