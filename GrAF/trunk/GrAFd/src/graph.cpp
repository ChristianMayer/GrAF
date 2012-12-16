/*
 *  <one line to give the program's name and a brief idea of what it does.>
 *  Copyright (C) 2012  Christian Mayer <email>
 * 
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 * 
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 * 
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

//#############################################################################
//#                                                                           #
//#  NOTE!                                                                    #
//#                                                                           #
//#  I tried to implement the JSON parser in Boost::spirit::qi, but           #
//#  - Binary size exploded                                                   #
//#  - Compile times exploded                                                 #
//#  - it didn't work.                                                        #
//#                                                                           #
//#  As I guess that's my fault (I didn't want to loose more than one day     #
//#  with it - this specialized JSON parser took only half a day...) someone  #
//#  more knowledgable might try it later on.                                 #
//#                                                                           #
//#############################################################################

#include "graph.hpp"

/**
 * Little helper macro to help readbility.
 */
#define THROW( text, pos ) throw( Graph::parseError( (text), (pos) ) )

using namespace std;

Graph::Graph( const char* string )
{
  try {
    parseString( string );
  } catch( parseError e )
  {
    logger << "parseError: '" << e.text << "' at '" << e.pos << "'\n";
    logger.show();
  } catch( ... )
  {
    logger << "Exception!\n";
    logger.show();
  }
  
  std::vector<vertex_t> topo_order;
  
  boost::topological_sort(g, std::back_inserter(topo_order));
  
  // Print the results.
  for( auto i = topo_order.crbegin();
      i != topo_order.crend();
  ++i)
      {
        logger << *i << ": " << g[*i].name << " = " << blockLookup[g[*i].name] << std::endl;
      }
      
      logger.show();
}

/**
 * @return end of a JSON string that starts at @param it
 */
string grepJsonString( char*& it )
{
  if( '"' == *it )
  {
    ++it; // move past beginning '"'
    const char* start = it;

    bool escape = false;
    while( ( '"' != *it ) || escape )
    {
      escape = ( '\\' == *it );
      ++it;
      
      if( '\0' == it )
        THROW( "Unexpected end of input", it );
    }
    return string( start, it++ - start ); // move past ending '"'
  }
  
  THROW( "JSON String expected", it );
}

string grepJsonNumberRaw( char *& it )
{
  const char* start = it;
  while( true )
  {
    switch( *it )
    {
      case '+': case '-': case '0': case '1': case '2': case '3': case '4':
      case '5': case '6': case '7': case '8': case '9': case 'e': case 'E':
      case '.':
        it++;
        continue;
    }
    break;
  }
  
  if( start == it ) THROW( "Number expected", it );
  
  return string( start, it - start );
}

double grepJsonNumber( char *& it )
{
  return stod( grepJsonNumberRaw( it ) );
}

bool grepJsonBool( char *& it )
{
  if( 't' == *it )
  {
    it++;
    if( ('r' == *it++) && ('u' == *it++) && ('e' == *it++) )
      return true;
  } else if( 'f' == *it )
  {
    it++;
    if( ('a' == *it++) && ('l' == *it++) && ('s' == *it++) && ('e' == *it++) )
      return false;
  }
  
  THROW( "Boolean value expected", it );
}

Graph::Block::parameters_t grepJsonFlatObject( char *& pos )
{
  auto skipWhiteSpace = [&](){ while( iswspace( *pos ) && pos++ != '\0' ) ; }; // FIXME
  map< string, string > ret;
  
  if( '{' != *pos++ ) THROW( "'{' expected", pos );
  skipWhiteSpace();
  
  while( '}' != *pos )
  {
    string key = grepJsonString( pos );
    
    skipWhiteSpace();
    if( ':' != *pos++ ) THROW( "':' expected", pos );
    skipWhiteSpace();
    
    ret[ key ] = ( '"' == *pos ) ? grepJsonString( pos ) : grepJsonNumberRaw( pos );
    
    skipWhiteSpace();
    if( ',' == *pos ) 
    {
      pos++;
      skipWhiteSpace();
    }
    
    if( '\0' == *pos )
      THROW( "Unexpected end of input", pos );
  }
  ++pos; // move past ending '}'
  return ret;
}

void Graph::grepBlock( char*& pos )
{
  auto skipWhiteSpace = [&](){ while( iswspace( *pos ) && pos++ != '\0' ) ; }; // FIXME
  
  string newBlockName = grepJsonString( pos );
  if( "" == newBlockName ) THROW( "String for block name expected", pos );
  skipWhiteSpace();
  if( ':' != *pos++ ) THROW( "':' expected", pos );
  skipWhiteSpace();
  if( '{' != *pos++ ) THROW( "'{' expected", pos );
  const char* start = pos;
  skipWhiteSpace();

  blockLookup[ newBlockName ] = boost::add_vertex( g );
  Block& thisBlock = g[ blockLookup[ newBlockName ] ];
  thisBlock.name = newBlockName;
  
  while( '}' != *pos )
  {
    string newBlockParameter = grepJsonString( pos );
    
    skipWhiteSpace();
    if( ':' != *pos++ ) THROW( "':' expected", pos );
    skipWhiteSpace();
    
    if       ( "type"       == newBlockParameter )
    {
      if( "" == (thisBlock.type = grepJsonString( pos )) ) THROW( "String for block parameter 'type' expected", pos );
    } else if( "x"          == newBlockParameter )
    {
      thisBlock.x           = grepJsonNumber( pos );
    } else if( "y"          == newBlockParameter )
    {
      thisBlock.y           = grepJsonNumber( pos );
    } else if( "width"      == newBlockParameter )
    {
      thisBlock.width       = grepJsonNumber( pos );
    } else if( "height"     == newBlockParameter )
    {
      thisBlock.height      = grepJsonNumber( pos );
    } else if( "flip"       == newBlockParameter )
    {
      thisBlock.flip        = grepJsonBool( pos );
    } else if( "parameters" == newBlockParameter )
    {
      thisBlock.parameters  = grepJsonFlatObject( pos );
    } else
      THROW( "Block paramenter expected", pos );
    
    skipWhiteSpace();
    if( ',' == *pos )
    {
      pos++;
      skipWhiteSpace();
    }
    
    if( '\0' == *pos )
      THROW( "Unexpected end of input", pos );
  }
  
  ++pos; // move past ending '}'
}

void Graph::grepSignal( char*& pos )
{
  auto skipWhiteSpace = [&](){ while( iswspace( *pos ) && pos++ != '\0' ) ; }; // FIXME
  
  skipWhiteSpace();
  if( '[' != *pos++ ) THROW( "'[' expected", pos );
  skipWhiteSpace();
  string fromBlock = grepJsonString( pos );
  if( "" == fromBlock ) THROW( "String for signal parameter expected", pos );
  //newSignal->first = blocks.find( first );
  skipWhiteSpace();
  if( ',' != *pos++ ) THROW( "',' expected", pos );
  skipWhiteSpace();
  int fromPort = grepJsonNumber( pos );
  skipWhiteSpace();
  if( ',' != *pos++ ) THROW( "',' expected", pos );
  skipWhiteSpace();
  string toBlock = grepJsonString( pos );
  if( "" == toBlock ) THROW( "String for signal parameter expected", pos );
  skipWhiteSpace();
  if( ',' != *pos++ ) THROW( "',' expected", pos );
  skipWhiteSpace();
  int toPort = grepJsonNumber( pos );
  skipWhiteSpace();
  if( ',' != *pos++ ) THROW( "',' expected", pos );
  skipWhiteSpace();
  if( '{' != *pos++ ) THROW( "'{' expected", pos );
  // TODO fill "optional"
  if( '}' != *pos++ ) THROW( "'}' expected", pos );
  skipWhiteSpace();
  if( ']' != *pos++ ) THROW( "']' expected", pos );
  skipWhiteSpace();

  edge_t e1;
  bool ok;
  boost::tie( e1, ok ) = boost::add_edge( blockLookup[fromBlock], blockLookup[toBlock], g );
  g[e1].fromPort = fromPort;
  g[e1].toPort   = toPort;
  //g[e1].optional = optional;
  
}

void Graph::parseString( const char* string )
{
  char* pos = const_cast<char*>( string ); // cast const away as we need a moveable pointer to the data
  
  auto skipWhiteSpace = [&](){ while( iswspace( *pos ) && *pos++ != '\0' ) ; };
  
  // Get into the structure
  skipWhiteSpace();
  if( '{' != *pos++ ) THROW( "'{' expected", pos );
  skipWhiteSpace();

  // Get into the blocks
  if( "blocks" != grepJsonString( pos ) ) THROW( "'blocks' expected", pos );
  skipWhiteSpace();
  if( ':' != *pos++ ) THROW( "':' expected", pos );
  skipWhiteSpace();
  if( '{' != *pos++ ) THROW( "'{' expected", pos );
  skipWhiteSpace();
  while( '}' != *pos )
  {
    grepBlock( pos );
    skipWhiteSpace();
    if( ',' == *pos )
    {
      pos++;
      skipWhiteSpace();
    }
  }
  pos++; // skip '}'
  
  skipWhiteSpace();
  if( ',' != *pos++ ) THROW( "',' expected", pos );
  skipWhiteSpace();
  
  // Get into the signals
  if( "signals" != grepJsonString( pos ) ) THROW( "'signals' expected", pos );
  skipWhiteSpace();
  if( ':' != *pos++ ) THROW( "':' expected", pos );
  skipWhiteSpace();
  if( '[' != *pos++ ) THROW( "'[' expected", pos );
  skipWhiteSpace();
  while( ']' != *pos )
  {
    grepSignal( pos );
    skipWhiteSpace();
    if( ',' == *pos )
    {
      pos++;
      skipWhiteSpace();
    }
  }
  pos++; // skip ']'
  
  // Close the structure
  skipWhiteSpace();
  if( '}' != *pos++ ) THROW( "'}' expected", pos );
}

ostream& operator<<(ostream &stream, const Graph::Block& block)
{
  stream << "{\n";
  stream << "    \"type\":       \"" << block.type   << "\",\n";
  stream << "    \"x\":          "   << block.x      << ",\n";
  stream << "    \"y\":          "   << block.y      << ",\n";
  stream << "    \"width\":      "   << block.width  << ",\n";
  stream << "    \"height\":     "   << block.height << ",\n";
  stream << "    \"flip\":       "   << (block.flip?"true":"false") << ",\n";
  if( block.parameters.cbegin() == block.parameters.cend() )
  {
    stream << "    \"parameters\": {}\n";
  } else {
    stream << "    \"parameters\": {\n";
    for( auto it = block.parameters.cbegin();; )
    {
      stream << "      \"" << ( *it ).first << "\": \"" << ( *it ).second << "\"";
      if( ( ++it ) != block.parameters.cend() )
        stream << ",\n";
      else
      {
        stream << "\n";
        break;
      }
    }
    stream << "    }\n";
  } 
  stream << "  }";
  return stream;
}

ostream& operator<<( ostream &stream, const Graph::Signal& signal )
{
  stream << "  [";
  //stream << "\"" << signal.first->first << "\", "; FIXME
  stream <<         signal.fromPort  <<   ", ";
  //stream << "\"" << signal.second->first   << "\", "; FIXME
  stream <<         signal.toPort    <<   ", ";
  stream << "{"  << signal.optional  << "}";
  stream << "]";
  return stream;
}
