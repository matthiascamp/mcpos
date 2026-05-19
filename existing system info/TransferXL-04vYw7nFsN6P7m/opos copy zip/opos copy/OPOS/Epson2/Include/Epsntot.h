/////////////////////////////////////////////////////////////////////
//
// EPSNTOT.H
//
//   Hard Totals header file for OPOS Applications.
//
// Modification history
// ------------------------------------------------------------------
//
/////////////////////////////////////////////////////////////////////

#if !defined(EPSNTOT_H)
#define      EPSNTOT_H



/////////////////////////////////////////////////////////////////////
// "ResultCodeExtended" Property Constants for HTotals
/////////////////////////////////////////////////////////////////////
const LONG OPOS_ETOT_NOTMAPMEMORY	= 1 + TOTERREXT;	// do not map memory 
const LONG OPOS_ETOT_INIT_DEVICE	= 2 + TOTERREXT;	// do not read initial data of device
const LONG OPOS_ETOT_READFILE		= 3 + TOTERREXT;	// do not read data
const LONG OPOS_ETOT_WRITEFILE		= 4 + TOTERREXT;	// do not write data
const LONG OPOS_ETOT_LOCKED			= 5 + TOTERREXT;	// loading another method
const LONG OPOS_ETOT_NODEFRAGMENTATION = 6 + TOTERREXT;	// do not defragmentation
const LONG OPOS_ETOT_NOMEMORY		= 7 + TOTERREXT;	// no memory
const LONG OPOS_ETOT_DELETE			= 8 + TOTERREXT;	// Deleting the file
const LONG OPOS_ETOT_RWPORT			= 9 + TOTERREXT;	// do not read/write I/O port

/////////////////////////////////////////////////////////////////////
// "DirectIO" Method Constants for HTotals
/////////////////////////////////////////////////////////////////////
const LONG TOT_DI_BACKUP			= 1;	//Backup 
const LONG TOT_DI_DEFRAGMENTATION	= 2;	//Defragmentation 

/////////////////////////////////////////////////////////////////////
// "DirectIOEvent" Event Constants for HTotals
/////////////////////////////////////////////////////////////////////
const LONG TOT_DIE_FORWARD			= 1;	// 
const LONG TOT_DIE_ROLLBACK			= 2;	// 

#endif                  // !defined(EPSNTOT_H)
