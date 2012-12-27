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

#include <cstddef>

#define SHOW 0

#if SHOW
#include <iostream>
using namespace std;
#endif

typedef unsigned char raw_t;
typedef ptrdiff_t     raw_offset_t;
class LogicElement_Generic;
typedef LogicElement_Generic** iterator;
typedef const iterator const_iterator;

class LogicElement_Generic
{
public:
  virtual ~LogicElement_Generic() {}
  virtual void calc( raw_t* const base ) const = 0;
};

class LogicElement_Add : public LogicElement_Generic
{
  const raw_offset_t to;
  const raw_offset_t from1;
  const raw_offset_t from2;
public:
  LogicElement_Add( const raw_offset_t _to, const raw_offset_t _from1, const raw_offset_t _from2 ) : to(_to), from1(_from1), from2(_from2)
  {}
  
  void calc( raw_t* const base ) const 
  {
    int &_to    = *reinterpret_cast<int* const>( base + to    );
    int &_from1 = *reinterpret_cast<int* const>( base + from1 );
    int &_from2 = *reinterpret_cast<int* const>( base + from2 );
    
#if SHOW
    cout << "to(" << to << "): " << _to;
    cout << ", from1(" << from1 << "): " << _from1;
    cout << ", from2(" << from2 << "): " << _from2 << endl;
    cout << "base pre(" << (int*)base << "): " << *(reinterpret_cast<LogicElement_Generic**>( base ));//(void*)(((int**)base)[0]);
#endif
    _to = _from1 + _from2;

    ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
    
    #if SHOW
    cout << " post(" << (int*)base << "): " << *(reinterpret_cast<LogicElement_Generic**>( base )) << "," << (void*)(((int**)base)[0]) << endl;
    #endif
  }
};

//char globalVariableBuffer[1000]; // a simple binary buffer
raw_t* globVar;
LogicElement_Generic** elementList;

int mainTest( void )
{
  globVar = new raw_t[1000];
  elementList = new LogicElement_Generic*[10000];
  
  raw_offset_t to    = 1*sizeof(int*);
  raw_offset_t from1 = to + sizeof(int);
  raw_offset_t from2 = from1 + sizeof(int);
  
  *((int*)(globVar+to   )) = 0;
  *((int*)(globVar+from1)) = 1;
  *((int*)(globVar+from2)) = 2;
  
  for( int i = 0; i < 10; i++ )
    elementList[i] = new LogicElement_Add( to, to, from1 );
  
  int elementCount = 10;
  
  reinterpret_cast<iterator*>(globVar)[0] = elementList;
  const_iterator elEnd = (elementList+elementCount);

  // while loop
  #if SHOW
  cout << "while: globVar(" << (void*)globVar << "): " << (void*)(((int**)globVar)[0]);
  cout << " cast: " << (*reinterpret_cast<LogicElement_Generic***>(globVar)) << " elEnd: " << elEnd << endl;
  #endif
  
  while( reinterpret_cast<iterator*>(globVar)[0] < elEnd )
  {
    #if SHOW
    cout << "pre: globVar(" << (void*)globVar << "): " << (void*)(((int**)globVar)[0]) << endl;
    #endif
    
    (*reinterpret_cast<iterator*>(globVar)[0])->calc( globVar );
    
    #if SHOW
    cout << "post: globVar(" << (void*)globVar << "): " << (void*)(((int**)globVar)[0]) << endl;
    #endif
  }
  
  #if SHOW
  cout << "while: globVar(" << (void*)globVar << "): " << (void*)(((int**)globVar)[0]);
  cout << " cast: " << (*reinterpret_cast<LogicElement_Generic***>(globVar)) << " elEnd: " << elEnd << endl;
  #endif
  
  
  
  return *((int*)(globVar+to));
}