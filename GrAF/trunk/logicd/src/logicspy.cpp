/*
 *    Logic engine - logic spy
 *    Copyright (C) 2012  Christian Mayer <mail at ChristianMayer dot de>
 * 
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    (at your option) any later version.
 * 
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU General Public License for more details.
 * 
 *    You should have received a copy of the GNU General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#include <iostream>

#include <sys/time.h>

#include "zmq.hpp"

#include "hexdump.hpp"
#include "message.hpp"

using namespace std;

void showHelp( void )
{
  cout << "Usage: logicspy [options] [filter]" << endl
  << endl
  << "Dump all messages sent from the logic deamon." << endl
  << endl
  << "Parameters:" << endl
  << "If a filter is given only messages fitting the filter string will be printed." << endl
  << "    -c, --color          Show each line color coded" << endl
  << "    -h, --help           This help message" << endl
  << "    -t, --time           Preceed each line with a timestamp" << endl
  << "    -v, --vebose         Verbose output - repeatable" << endl;
}

void printTimestamp( void )
{
  timeval currentTime;
  gettimeofday(&currentTime, NULL);
  int milli = currentTime.tv_usec / 1000;
    
  char buffer[80];
  strftime( buffer, 80, "%Y-%m-%d %H:%M:%S", localtime( &currentTime.tv_sec ) );
    
  cout << "[" << buffer << "." << milli << "] ";
}

// Terminal codes to set colors
const char* const colorDefault = "\033[0m";
const char* const colorRed     = "\033[31m";
const char* const colorGreen   = "\033[32m";
const char* const colorBlue    = "\033[34m";

int main( int argc, char *argv[] )
{
  ///////////////////////////////////////////////////////////////////////////
  //
  //  Setup
  //
  bool showColor = false;
  bool showTime  = false;
  int  verbose   = 0;
  string filter("");
  
  while( argc-- > 1 )
  {
    string parameter( argv[ argc ] );
    
    if     ( parameter == "-c" || parameter == "--color"   )
    {
      showColor = true;
    } 
    else if( parameter == "-h" || parameter == "--help"    )
    {
      showHelp();
      return 0;
    } 
    else if( parameter == "-t" || parameter == "--time"    )
    {
      showTime = true;
    } 
    else if( parameter == "-v" || parameter == "--verbose" )
    {
      verbose++;
    } 
    else 
    {
      filter = parameter;
    }
  }
  
  if( verbose ) 
  {
    cout << "Running with verbosity " << verbose << " of 1" << endl;
    cout << "Filtering for \"" << filter << "\":" << endl;
  }
  
  zmq::context_t context( 1 );  // one communiaction thread is enough
  
  // Socket to talk to server
  zmq::socket_t subscriber( context, ZMQ_SUB );
  subscriber.connect( "ipc:///tmp/logicd.messages.ipc" );
  
  subscriber.setsockopt( ZMQ_SUBSCRIBE, filter.c_str(), filter.length() );
  
  ///////////////////////////////////////////////////////////////////////////
  //
  //  Main loop
  //
  while( true )
  {
    LogicMessage msg = recieveMessage( subscriber ); // wait for message
    
    if( showColor ) cout << colorGreen;
    if( showTime ) printTimestamp();
    
    if( showColor ) cout << colorDefault;
    cout << msg.getAddress();
    if( verbose )
      cout << " [" << msg.getSize() << "]: ";
    else
      cout << ": ";
    
    switch( msg.getType() )
    {
      case LogicMessage::INT:
        cout << "INT: " << msg.getInt() << " 0x" << hex << msg.getInt() << dec << endl;
        break;
      case LogicMessage::FLOAT:
        cout << "FLOAT: " << msg.getFloat() << endl;
        break;
      case LogicMessage::STRING:
        cout << "STRING: " << msg.getString() << endl;
        break;
      default:
        cout << "unknown / default" << endl;
    }
    
    if( verbose )
    {
      if( showColor ) cout << colorBlue;
      cout << hexdump( msg.getRaw(), msg.getSize() );
      if( showColor ) cout << colorDefault;
    }
    cout << flush;
  }
  
  return 0;
}
