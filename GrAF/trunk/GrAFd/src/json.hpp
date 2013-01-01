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

#ifndef JSON_HPP
#define JSON_HPP

#include <istream>
#include <functional>

namespace JSON
{
  enum Type {
    UNKNOWN,
    BOOL,
    NUMBER,
    STRING,
    ARRAY,
    OBJECT
  };
  
  Type identifyNext( std::istream& in );
  
  /**
   * Skip whitespace an comments in C and/or C++ style
   */
  std::istream& consumeEmpty( std::istream& in );
  
  /**
   * Read the string "true" or "false" from @param in and return it as an 
   * boolean.
   */
  bool readJsonBool( std::istream& in );
  
  /**
   * Read a JSON style string from @param in and return it.
   * This string has to be between quotation marks and might escape internally
   * used quotation marks.
   * Example: "ab\"c" will result in the std::string: ab"c 
   */
  std::string readJsonString( std::istream& in );
  
  /**
   * Define the function signature of the function that will be called
   * for each object found
   */
  typedef std::function<void ( std::istream& in )> jsonObjectHandler_t;
  
  /**
   * Read a JSON array and call @param entryHandler for each entry.
   */
  void readJsonArray( std::istream& in, jsonObjectHandler_t entryHandler );
  
  /**
   * Define the function signature of the function that will be called
   * for each object found. The @param name contains the key for that object.
   */
  typedef std::function<void ( std::istream& in, const std::string& name )> jsonNamedObjectHandler_t;
  
  /**
   * Read a JSON object and call @param entryHandler for each entry.
   */
  void readJsonObject( std::istream& in, jsonNamedObjectHandler_t entryHandler );

  /**
   * Escape the string.
   */
  std::string escape( const std::string& str, bool keepNewline = false );
  
  /**
   * The object that will be thrown when a parsing error will happen.
   */
  struct parseError
  {
    /**
     * The error message.
     */
    std::string text;
    /**
     * The stream with the error (at the current stream position).
     */
    std::istream& stream;
    /**
     * Boolean to indicate if this parseError has a stream information included.
     */
    bool hasStream;
    
    /**
     * Throw a JSON::parseError without a corresponding istream.
     */
    parseError( const std::string& t ) : text( t ), stream( *(std::istream*)(nullptr) ), hasStream( false ) {}
    /**
     * Throw a JSON::parseError with error message and the stream s at the
     * position of the parse error.
     */
    parseError( const std::string& t, std::istream& s ) : text( t ), stream( s ), hasStream( true ) {}
    
    /**
     * Return the offending line and change @param errorLineNo and 
     * @param errorCharPos to the number and position of the error.
     */
    std::string getErrorLine( int& errorLineNo, int& errorCharPos );
  };
}

#endif // JSON_HPP
