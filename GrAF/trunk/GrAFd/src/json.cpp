/*
 * The Graphic Automation Framework deamon
 * Copyright (C) 2012  Christian Mayer - mail (at) ChristianMayer (dot) de
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#include "json.hpp"

#include "globals.h"
#include "logger.hpp"
using namespace std;

/**
 * Little helper macro to help readbility.
 */
#ifdef THROW
#  error THROW macro already defined!
#endif
#define THROW( text, pos ) throw( JSON::parseError( (text), (pos), __LINE__ ,__FILE__ ) )

JSON::Type JSON::identifyNext( std::istream& in )
{
  switch( in.peek() )
  {
    case 't':
    case 'f':
      return BOOL;
      
    case '+': case '-': case '0': case '1': case '2': case '3': case '4':
    case '5': case '6': case '7': case '8': case '9': case '.':
      // note: 'e' and 'E' can't the first character
      return NUMBER;
      
    case '"':
      return STRING;
      
    case '[':
      return ARRAY;
      
    case '{':
      return OBJECT;
      
    default:
      return UNKNOWN;
  }
}

istream& JSON::consumeEmpty( istream& in )
{
  in >> ws;              // skip starting whitespace
  
  if( '/' == in.get() ) // and a possible comment
  {
    char next = in.peek();
    if( '/' == next ) 
    { 
      // C++ style comment found
      in.ignore( numeric_limits<streamsize>::max(), '\n' ); // skip to end of line
      
      return in >> consumeEmpty;
    } else if( '*' == next )
    { 
      // C style comment found
      in.get(); // remove the '*'
      do {
        in.ignore( numeric_limits<streamsize>::max(), '*' );
      } while( '/' != in.peek() );
      in.get(); // remove the '/'
      
      return in >> consumeEmpty;
    } else
      in.unget(); // put back the '/' as it wasn't a comment
  } else
    in.unget();   // put back the gotten char as it wasn't a comment
    
  return in;
}

bool JSON::readJsonBool( istream& in )
{
  if( 't' == in.peek() && 
    't' == in.get() && 'r' == in.get() && 'u' == in.get() && 'e' == in.get() )
  {
    return true;
  } else if( 'f' == in.peek() && 
    'f' == in.get() && 'a' == in.get() && 'l' == in.get() && 's' == in.get() && 'e' == in.get() )
  {
    return false;
  }
  
  THROW( "Boolean value expected", in );
}

string JSON::readJsonString( istream& in )
{
  if( '"' == in.get() )
  {
    auto startPos = in.tellg();

    char c;
    bool escape = false;
    while( '"' != (c = in.get()) || escape )
    {
      escape = ( '\\' == c );
    }
    auto endPos = in.tellg();

    string ret( endPos - startPos - 1, '\0');
    in.seekg( startPos );
    in.read( &ret[0], endPos - startPos - 1 );
    in.get(); // move past ending '"'

    return unescape( ret );
  }
  
  in.unget();
  
  THROW( "JSON String expected", in );
}

void JSON::readJsonArray( istream& in, jsonObjectHandler_t entryHandler )
{
  if( '[' != in.get() )
    THROW( "JSON Array '[' expected", in );
    
  do
  {
    in >> consumeEmpty;
    if( ']' == in.peek() )
    {
      in.get(); // consume ']'
      break; // early exit
    }
    entryHandler( in );
    in >> consumeEmpty;
  }
  while( ',' == in.get() );   // will also remove the remaining ']'
}

void JSON::readJsonObject( istream& in, jsonNamedObjectHandler_t entryHandler )
{
  if( '{' != in.get() )
    THROW( "JSON Object '{' expected", in );

  char last;
  do
  {
    in >> consumeEmpty;
    if( '}' == in.peek() )
    {
      last = in.get(); // consume '}'
      break; // early exit
    }
    string key = readJsonString( in );
    in >> consumeEmpty;
    if( ':' != in.get() )
      THROW( "JSON Object ':' expected", in );
    in >> consumeEmpty;
    entryHandler( in, key );
    in >> consumeEmpty;
  }
  while( ',' == (last = in.get()) ); // will also remove the remaining '}'

  if( '}' != last )
    THROW( "JSON Object '}' expected", in );
}

string JSON::escape( const string& str, bool keepNewline )
{
  string ret;
  ret.reserve( 2 * str.length() ); // prepare for enough size
  
  size_t pos = 0;
  while( pos != string::npos )
  {
    if( keepNewline || pos == 0 )
      ret += "\"";
      
    size_t nextPos = str.find_first_of( "\n", pos );
    while( (pos < nextPos) && (pos < str.length()) )
    {
      char c = str[pos];
      switch( c )
      {
        case '"':
          ret += "\\\"";
          break;
          
        default:
          ret += c;
      }
      pos++;
    }
    
    if( nextPos != string::npos )
    {
      if( keepNewline )
        ret += "\\n\" +\n";
      else
        ret += "\\n";
      nextPos++;
    } else {
      ret += "\"";
    }
    pos = nextPos;
  }
  
  return ret;
}

string JSON::unescape( const string& str )
{
  string ret;
  ret.reserve( str.length() );
  
  bool escape = false;
  for( auto it = str.cbegin(); it != str.cend(); it++ )
  {
    if( escape )
    {
      switch( *it )
      {
        case '\\':
          ret.push_back( '\\' );
          break;
        case 'n':
          ret.push_back( '\n' );
          break;
        case '"':
          ret.push_back( '"' );
          break;
        default:
          ret.push_back( '\\' );
          ret.push_back( *it );
      }
      escape = false;
    } else if( '\\' == *it )
      escape = true;
    else
      ret.push_back( *it );
  }
  
  return ret;
}

string JSON::parseError::getErrorLine( int& errorLineNo, int& errorCharPos )
{
  if( !hasStream )
  {
    errorLineNo = -1;
    errorCharPos = -1;
    return "<no stream>";
  }
  
  if( stream.fail() )
    stream.clear();
  streampos errorPos = stream.tellg();
  streampos lastPos  = 0;
  streampos thisPos  = 0;
  
  errorLineNo = 0;
  
  // rewind to start line counting
  stream.seekg( 0 );
  while( ((thisPos = stream.tellg()) < errorPos) && (thisPos >= 0) )
  {
    errorLineNo++;
    lastPos = thisPos;
    stream.ignore( numeric_limits<streamsize>::max(), '\n' );
  }
  errorCharPos = errorPos - lastPos;
  if( thisPos < lastPos ) thisPos = lastPos; 
  char *errorLine = new char[thisPos - lastPos];
  stream.seekg( lastPos );
  stream.getline( errorLine, thisPos - lastPos );
  string ret( errorLine );
  delete errorLine;
  stream.seekg( errorPos );
  return ret;
}