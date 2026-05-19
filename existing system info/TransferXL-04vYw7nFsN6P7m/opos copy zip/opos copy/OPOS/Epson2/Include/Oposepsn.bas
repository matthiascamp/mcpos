Attribute VB_Name = "OPOSEPSN"

' /////////////////////////////////////////////////////////////////////
' //
' // EPSON.H
' //
' //   General header file for EPSON Applications.
' //
' // Modification history
' // ------------------------------------------------------------------
' // 96-01-05 OPOS Release 1.0                                     Kata
' // 96-04-25 OPOS Release 1.1; OPOS-J 1.0
' // 96-07-08 DirectIO command for device specific details setting
' //
' /////////////////////////////////////////////////////////////////////

' // * default numeric property on error *

Public Const PROP_ERRNUMBER As Long = 0&  

' // * default string property on error *

Public Const PROP_ERRSTRING As String = _T("[Error]")  

' /////////////////////////////////////////////////////////////////////
' // OPOS "ResultCodeExtended" Property Base Constants
' /////////////////////////////////////////////////////////////////////

Public Const EPSNERREXT As Long = 10000&    ' // EPSON specific error base
Public Const CASHERREXT As Long = 20000&    ' // Cash Drawer specific error base
Public Const COINERREXT As Long = 30000&    ' // Coin Dispenser specific error base
Public Const TOTERREXT As Long = 40000&     ' // Hard Totals specific error base
Public Const LOCKERREXT As Long = 50000&    ' // Keylock specific error base
Public Const DISPERREXT As Long = 60000&    ' // Line Display specific error base
Public Const MICRERREXT As Long = 70000&    ' // MICR specific error base
Public Const MSRERREXT As Long = 80000&     ' // MSR specific error base
Public Const KBDERREXT As Long = 90000&     ' // POS Keyboard specific error base
Public Const PTRERREXT As Long = 100000&    ' // POS Printer specific error base
Public Const SCALERREXT As Long = 110000&   ' // Scale specific error base
Public Const SCANERREXT As Long = 120000&   ' // Scanner specific error base
Public Const SIGERREXT As Long = 130000&    ' // Signature Capture specific error base
Public Const CHKERREXT As Long = 140000&    ' // Check Scanner specific error base
Public Const EJERREXT As Long = 150000&     ' // Check Scanner specific error base
Public Const PORTERREXT As Long = 200000&   ' // CPortDrv error base
Public Const PARAMERREXT As Long = 300000&      ' // Parameter error base

' /////////////////////////////////////////////////////////////////////
' // "ResultCodeExtended" Property Constants (EPSON specific)
' /////////////////////////////////////////////////////////////////////

Public Const OPOS_EX_BADCO As Long = 1& + EPSNERREXT                ' // invalid CO I/F
Public Const OPOS_EX_BADPORT As Long = 2& + EPSNERREXT              ' // invalid Port
Public Const OPOS_EX_BADDEVICE As Long = 3& + EPSNERREXT            ' // invalid DeviceName
Public Const OPOS_EX_BADPROPIDX As Long = 4& + EPSNERREXT           ' // invalid property index
Public Const OPOS_EX_BADPROPVAL As Long = 5& + EPSNERREXT           ' // invalid property value
Public Const OPOS_EX_NOTSUPPORTED As Long = 6& + EPSNERREXT         ' // function not supported
Public Const OPOS_EX_NOASB As Long = 7& + EPSNERREXT                ' // no ASB data returned(Ver1.0 - Ver1.9)
Public Const OPOS_EX_NOINPUT As Long = 7& + EPSNERREXT              ' // no input data returned (Ver2.0 -)
Public Const OPOS_EX_BUSY As Long = 8& + EPSNERREXT                 ' // Async Output busy
Public Const OPOS_EX_INCAPABLE As Long = 9& + EPSNERREXT            ' // incapable of the function
Public Const OPOS_EX_INVALIDMODE As Long = 10& + EPSNERREXT         ' // invalid device mode
Public Const OPOS_EX_REOPEN As Long = 11& + EPSNERREXT              ' // re-open
Public Const OPOS_EX_BADPEEKRANGE As Long = 12& + EPSNERREXT        ' // PeekRange invalid
Public Const OPOS_EX_BADDISPRANGE As Long = 13& + EPSNERREXT        ' // DispatchRange invalid
Public Const OPOS_EX_NOTCLAIMED As Long = 14& + EPSNERREXT          ' // Not claimed (Release method used)
Public Const OPOS_EX_TIMEOUT As Long = 15& + EPSNERREXT             ' // sync output timeout
Public Const OPOS_EX_PORTUSED As Long = 16& + EPSNERREXT            ' // Port used by another
Public Const OPOS_EX_PORTBUSY As Long = 17& + EPSNERREXT            ' // HOST Port busy
Public Const OPOS_EX_MICRMODE As Long = 18& + EPSNERREXT            ' // MICR mode
Public Const OPOS_EX_PORTLOCKED As Long = 18& + EPSNERREXT          ' // Port locked by another
Public Const OPOS_EX_DEVBUSY As Long = 19& + EPSNERREXT             ' // device busy
Public Const OPOS_EX_BADINF As Long = 20& + EPSNERREXT              ' // invalid INF file
Public Const OPOS_EX_DISPOSE_ERROREVENT As Long = 21& + EPSNERREXT      ' // Disporse Error Event
Public Const OPOS_EX_EXCEED_FILE_LIMIT As Long = 22& + EPSNERREXT       ' // Exceed FilesSystem limit
Public Const OPOS_EX_UNAUTHORIZED As Long = 23& + EPSNERREXT            ' // Unauthorized action
Public Const OPOS_EX_WAITING_REMOVAL As Long = 24& + EPSNERREXT         ' // Waiting for slip/check removal

Public Const OPOS_EX_SOVERSION As Long = 100& + EPSNERREXT      ' // invalid SO version

Public Const OPOS_EX_BADPARAM As Long = PARAMERREXT             ' // invalid parameter (general)

Public Const OPOS_EFIRMWARE_WRITE_FAILED As Long = 30& + EPSNERREXT         ' // Failed to download firmware to device

Public Const OPOS_EX_FAIL_MULTI_INTERFACE_PRINTING As Long = 31& + EPSNERREXT   ' // Failed the acquisition of the multi interface printing right.

' /////////////////////////////////////////////////////////////////////
' // DirectIO commands
' /////////////////////////////////////////////////////////////////////

' /////////////////////////////////////////////////////////////////////
' //
' // EPSNCASH.H
' //
' //    header file for OPOS Applications.
' //
' // Modification history
' // ------------------------------------------------------------------
' // 04-08-09 OPOS Release 1.8                                     
' //
' /////////////////////////////////////////////////////////////////////

' /////////////////////////////////////////////////////////////////////
' // DirectIO Command
Public Const DRW_DI_OPEN_DRAWER As Long = 1&  

' /////////////////////////////////////////////////////////////////////
' //
' // EpsnCScn.H
' //
' //    header file for OPOS Applications.
' //
' // Modification history
' // ------------------------------------------------------------------
' // 01-09-14 OPOS Release ??                                     
' // 02-12-16 OPOS Release 1.7                                     
' //
' /////////////////////////////////////////////////////////////////////

' /////////////////////////////////////////////////////////////////////
' // DirectIO Command
Public Const CHK_DI_ENDINSERTION_EXTEND As Long = 2&  
Public Const CHK_DI_PRESCAN As Long = 3&  
Public Const CHK_DI_READ_AREA As Long = 4&  
Public Const CHK_DI_IMAGE_FILTER As Long = 5&  
Public Const CHK_DI_ATTACHED_DATA As Long = 6&  
Public Const CHK_DI_SIZE_OFFSET As Long = 7&  
Public Const CHK_DI_BORDER_COLOR As Long = 8&  
Public Const CHK_DI_ROTATE_IMAGE As Long = 9&  
Public Const CHK_DI_TMSTORE_SET_INDEX As Long = 10&  
Public Const CHK_DI_TMSTORE_ERRORMODE As Long = 11&  
Public Const CHK_DI_TMSTORE_GET_FREEMEM As Long = 12&  
Public Const CHK_DI_CHANGE_MODE As Long = 13&  
Public Const CHK_DI_SHARPNESS_IMAGE As Long = 14&  
Public Const CHK_DI_GET_SUPPORT_FUNCTION As Long = 15&  
Public Const CHK_DI_RETRIEVEQUALITY As Long = 17&  
Public Const CHK_DI_RECOVER_ERROR As Long = 18&  

' // param2 CHK_DI_ENDINSERTION_EXTEND
Public Const CHK_DI_EXTEND_DEFAULT As Long = &H80000000&  
Public Const CHK_DI_EXTEND_PRESCAN As Long = &H1&  
Public Const CHK_DI_EXTEND_READAREA As Long = &H2&  
Public Const CHK_DI_EXTEND_FILTER As Long = &H4&  
Public Const CHK_DI_EXTEND_ATTACHED As Long = &H8&  
Public Const CHK_DI_EXTEND_TMSTORE As Long = &H10&  

' // param2 CHK_DI_ROTATE_IMAGE
Public Const CHK_DI_ROTATE_OFF As Long = 0&  
Public Const CHK_DI_ROTATE_ON As Long = 1&  

' // param2 CHK_DI_TMSTORE_ERRORMODE
Public Const CHK_DI_ERRORMODE_CANCEL As Long = 0&  
Public Const CHK_DI_ERRORMODE_RETRY As Long = 1&  

' // param2 CHK_DI_CHANGE_MODE
Public Const CHK_DI_MODE_CHECKSCANNER As Long = &H0&  
Public Const CHK_DI_MODE_CARDSCANNER As Long = &H1&  

' // param2 CHK_DI_SHARPNESS_IMAGE
Public Const CHK_DI_SHARPNESS_OFF As Long = &H0&  
Public Const CHK_DI_SHARPNESS_ON As Long = &H1&  

' // param2 CHK_DI_GET_SUPPORT_FUNCTION
Public Const CHK_DI_CHECKSCANNER As Long = &H1&  
Public Const CHK_DI_CARDSCANNER As Long = &H2&  
Public Const CHK_DI_TMSTORAGE As Long = &H4&  
Public Const CHK_DI_SHARPNESS As Long = &H8&  

' // param2 CHK_DI_RETRIEVEQUALITY
Public Const CHK_DI_200X200 As Long = &H1&  
Public Const CHK_DI_100X100 As Long = &H2&  

' /////////////////////////////////////////////////////////////////////
' // ResultCodeExtennded
Public Const OPOS_ECHK_DATAERROR As Long = CHKERREXT + 3&  
Public Const OPOS_ECHK_CANCEL As Long = CHKERREXT + 4&  
Public Const OPOS_ECHK_DATAEND As Long = CHKERREXT + 5&  
Public Const OPOS_ECHK_TIMEOUT As Long = CHKERREXT + 6&  
Public Const OPOS_ECHK_NODATA As Long = CHKERREXT + 7&  
Public Const OPOS_ECHK_RESPONSE As Long = CHKERREXT + 8&  
Public Const OPOS_ECHK_PTRERROR As Long = CHKERREXT + 9&  
Public Const OPOS_ECHK_BADSIZE As Long = CHKERREXT + 10&  
Public Const OPOS_ECHK_ENCODE As Long = CHKERREXT + 11&  
Public Const OPOS_ECHK_EXIST As Long = CHKERREXT + 13&  
Public Const OPOS_ECHK_SAMEID As Long = CHKERREXT + 14&  
Public Const OPOS_ECHK_SAMETAG As Long = CHKERREXT + 15&  
Public Const OPOS_ECHK_TMSTORE_NOROOM As Long = CHKERREXT + 16&  
Public Const OPOS_ECHK_TMSTORE_WRITE As Long = CHKERREXT + 17&  

' /////////////////////////////////////////////////////////////////////
' // EPSON original CheckScanner

' /////////////////////////////////////////////////////////////////////
' // "CapFormat" Property Constants
' /////////////////////////////////////////////////////////////////////

Public Const ECHK_CIF_TIFF As Long = &H2&  
Public Const ECHK_CIF_BMP As Long = &H4&  
Public Const ECHK_CIF_JPEG As Long = &H8&  

' /////////////////////////////////////////////////////////////////////
' // "Color" Property Constants
' /////////////////////////////////////////////////////////////////////

Public Const ECHK_CCL_MONO As Long = &H1&  
Public Const ECHK_CCL_GRAYSCALE As Long = &H2&  
Public Const ECHK_CCL_16 As Long = &H4&  
Public Const ECHK_CCL_256 As Long = &H8&  
Public Const ECHK_CCL_FULL As Long = &H10&  

' /////////////////////////////////////////////////////////////////////
' // "Format" Property Constants
' /////////////////////////////////////////////////////////////////////

Public Const ECHK_IF_TIFF As Long = 2&  
Public Const ECHK_IF_BMP As Long = 3&  
Public Const ECHK_IF_JPEG As Long = 4&  

' /////////////////////////////////////////////////////////////////////
' // "ImageMemoryStatus" Property Constants
' /////////////////////////////////////////////////////////////////////

Public Const ECHK_IMS_EMPTY As Long = 1&  
Public Const ECHK_IMS_OK As Long = 2&  
Public Const ECHK_IMS_FULL As Long = 3&  

' /////////////////////////////////////////////////////////////////////
' // "MapMode" Property Constants
' /////////////////////////////////////////////////////////////////////

Public Const ECHK_MM_DOTS As Long = 1&  
Public Const ECHK_MM_TWIPS As Long = 2&  
Public Const ECHK_MM_ENGLISH As Long = 3&  
Public Const ECHK_MM_METRIC As Long = 4&  

' /////////////////////////////////////////////////////////////////////
' // "Color" Property Constants
' /////////////////////////////////////////////////////////////////////

Public Const ECHK_CL_MONO As Long = 1&  
Public Const ECHK_CL_GRAYSCALE As Long = 2&  
Public Const ECHK_CL_16 As Long = 3&  
Public Const ECHK_CL_256 As Long = 4&  
Public Const ECHK_CL_FULL As Long = 5&  

' /////////////////////////////////////////////////////////////////////
' // ClearImage Method "By" Parameter Constants
' /////////////////////////////////////////////////////////////////////

Public Const ECHK_CLR_ALL As Long = 1&  
Public Const ECHK_CLR_BY_FILEID As Long = 2&  
Public Const ECHK_CLR_BY_FILEINDEX As Long = 3&  
Public Const ECHK_CLR_BY_IMAGETAGDATA As Long = 4&  

' /////////////////////////////////////////////////////////////////////
' // RetrieveMemory Method "By" Parameter Constants
' /////////////////////////////////////////////////////////////////////

Public Const ECHK_LOCATE_BY_FILEID As Long = 1&  
Public Const ECHK_LOCATE_BY_FILEINDEX As Long = 2&  
Public Const ECHK_LOCATE_BY_IMAGETAGDATA As Long = 3&  

' /////////////////////////////////////////////////////////////////////
' // "CropAreaID" Parameter Constants
' /////////////////////////////////////////////////////////////////////

Public Const ECHK_CROP_AREA_RESET_ALL As Long = -2&  
Public Const ECHK_CROP_AREA_ENTIRE_IMAGE As Long = -1&  
Public Const ECHK_CROP_AREA_RIGHT As Long = -1&  
Public Const ECHK_CROP_AREA_BOTTOM As Long = -1&  

' /////////////////////////////////////////////////////////////////////
' // StatusUpdateEvent
Public Const ECHK_SUE_SCANCOMPLETE As Long = 11&  

' /////////////////////////////////////////////////////////////////////
' // DirectIO Command
' //const LONG ECHK_DI_OUTPUT				= 1;
Public Const ECHK_DI_ENDINSERTION_EXTEND As Long = CHK_DI_ENDINSERTION_EXTEND  
Public Const ECHK_DI_PRESCAN As Long = CHK_DI_PRESCAN  
Public Const ECHK_DI_READ_AREA As Long = CHK_DI_READ_AREA  
Public Const ECHK_DI_IMAGE_FILTER As Long = CHK_DI_IMAGE_FILTER  
Public Const ECHK_DI_ATTACHED_DATA As Long = CHK_DI_ATTACHED_DATA  
Public Const ECHK_DI_SIZE_OFFSET As Long = CHK_DI_SIZE_OFFSET  
Public Const ECHK_DI_BORDER_COLOR As Long = CHK_DI_BORDER_COLOR  
Public Const ECHK_DI_ROTATE_IMAGE As Long = CHK_DI_ROTATE_IMAGE  
Public Const ECHK_DI_TMSTORE_SET_INDEX As Long = CHK_DI_TMSTORE_SET_INDEX  
Public Const ECHK_DI_TMSTORE_ERRORMODE As Long = CHK_DI_TMSTORE_ERRORMODE  
Public Const ECHK_DI_TMSTORE_GET_FREEMEM As Long = CHK_DI_TMSTORE_GET_FREEMEM  

' // param2 ECHK_DI_ENDINSERTION_EXTEND
Public Const ECHK_DI_EXTEND_DEFAULT As Long = CHK_DI_EXTEND_DEFAULT  
Public Const ECHK_DI_EXTEND_PRESCAN As Long = CHK_DI_EXTEND_PRESCAN  
Public Const ECHK_DI_EXTEND_READAREA As Long = CHK_DI_EXTEND_READAREA  
Public Const ECHK_DI_EXTEND_FILTER As Long = CHK_DI_EXTEND_FILTER  
Public Const ECHK_DI_EXTEND_ATTACHED As Long = CHK_DI_EXTEND_ATTACHED  
Public Const ECHK_DI_EXTEND_TMSTORE As Long = CHK_DI_EXTEND_TMSTORE  

' // param2 ECHK_DI_ROTATE_IMAGE
Public Const ECHK_DI_ROTATE_OFF As Long = CHK_DI_ROTATE_OFF  
Public Const ECHK_DI_ROTATE_ON As Long = CHK_DI_ROTATE_ON  

' // param2 CHK_DI_TMSTORE_ERRORMODE
Public Const ECHK_DI_ERRORMODE_CANCEL As Long = CHK_DI_ERRORMODE_CANCEL  
Public Const ECHK_DI_ERRORMODE_RETRY As Long = CHK_DI_ERRORMODE_RETRY  

' /////////////////////////////////////////////////////////////////////
' // ResultCodeExtennded
Public Const OPOS_EECHK_NOCHECK As Long = 201&  
Public Const OPOS_EECHK_CHECK As Long = 202&  
Public Const OPOS_EECHK_DATAERROR As Long = OPOS_ECHK_DATAERROR  
Public Const OPOS_EECHK_CANCEL As Long = OPOS_ECHK_CANCEL  
Public Const OPOS_EECHK_DATAEND As Long = OPOS_ECHK_DATAEND  
Public Const OPOS_EECHK_TIMEOUT As Long = OPOS_ECHK_TIMEOUT  
Public Const OPOS_EECHK_NODATA As Long = OPOS_ECHK_NODATA  
Public Const OPOS_EECHK_RESPONSE As Long = OPOS_ECHK_RESPONSE  
Public Const OPOS_EECHK_PTRERROR As Long = OPOS_ECHK_PTRERROR  
Public Const OPOS_EECHK_BADSIZE As Long = OPOS_ECHK_BADSIZE  
Public Const OPOS_EECHK_ENCODE As Long = OPOS_ECHK_ENCODE  
Public Const OPOS_EECHK_NOROOM As Long = 203&  
Public Const OPOS_EECHK_EXIST As Long = OPOS_ECHK_EXIST  
Public Const OPOS_EECHK_SAMEID As Long = OPOS_ECHK_SAMEID  
Public Const OPOS_EECHK_SAMETAG As Long = OPOS_ECHK_SAMETAG  
Public Const OPOS_EECHK_TMSTORE_NOROOM As Long = OPOS_ECHK_TMSTORE_NOROOM  
Public Const OPOS_EECHK_TMSTORE_WRITE As Long = OPOS_ECHK_TMSTORE_WRITE  

' /////////////////////////////////////////////////////////////////////
' //
' // EPSNDISP.H
' //
' //   Line Display header file for OPOS Applications.
' //
' // Modification history
' // ------------------------------------------------------------------
' // 95-11-29 OPOS Release 1.0                                     Kata
' //
' /////////////////////////////////////////////////////////////////////

' /////////////////////////////////////////////////////////////////////
' // "ResultCodeExtended" Property Constants for Line Display
' /////////////////////////////////////////////////////////////////////
Public Const OPOS_EDISP_TOOMANYWINDOWS As Long = 1& + DISPERREXT    ' // 
Public Const OPOS_EDISP_TOOMANYDEFGLYPH As Long = 2& + DISPERREXT   ' // 

' /////////////////////////////////////////////////////////////////////
' // DirectIO Method Constants
' /////////////////////////////////////////////////////////////////////
' // DirectIO Command
Public Const DISP_DI_SYNC As Long = 0&  
Public Const DISP_DI_OUTPUT_NORMAL As Long = 1&  
Public Const DISP_DI_GRAPHIC As Long = 2&  
Public Const DISP_DI_SETIMAGE As Long = 3&  
Public Const DISP_DI_GETMODE As Long = 4&  
Public Const DISP_DI_SETFONT As Long = 5&  
Public Const DISP_DI_GW_STYLE As Long = 6&  
Public Const DISP_DI_OUTPUT As Long = DISP_DI_OUTPUT_NORMAL  
Public Const DISP_DI_FLASH_BITMAP As Long = 7&  

' // pData
Public Const DISP_DI_DUMMY As Long = 0&  
Public Const DISP_DI_MODE_CHARACTER As Long = 1&  
Public Const DISP_DI_MODE_GRAPHICS As Long = 2&  
Public Const DISP_DI_FONT_A As Long = 10&  
Public Const DISP_DI_FONT_B As Long = 11&  
Public Const DISP_DI_GW_NORMAL As Long = 20&  
Public Const DISP_DI_GW_TRANSPARENT As Long = 21&  

' /////////////////////////////////////////////////////////////////////
' //
' // EPSNEJ.H
' //
' //    header file for OPOS Applications.
' //
' // Modification history
' // ------------------------------------------------------------------
' // new
' //
' /////////////////////////////////////////////////////////////////////

' /////////////////////////////////////////////////////////////////////
' // DirectIO Command
Public Const EJ_DI_RECOVER_ERROR As Long = 0&  

' /////////////////////////////////////////////////////////////////////
' // ResultCodeExtennded
Public Const OPOS_EEJ_EJ_PRINTING As Long = EJERREXT + 1&  
Public Const OPOS_EEJ_PTR_PRINTING As Long = EJERREXT + 2&  
Public Const OPOS_EEJ_MEDIUM_USED As Long = EJERREXT + 3&  
Public Const OPOS_EEJ_MARKERORDER As Long = EJERREXT + 4&  
Public Const OPOS_EEJ_BADFILE As Long = EJERREXT + 5&  

' /////////////////////////////////////////////////////////////////////
' //
' // EPSNLOCK.H
' //
' //   LOCK header file for EPSON Applications.
' //
' // Modification history
' // ------------------------------------------------------------------
' //
' /////////////////////////////////////////////////////////////////////

' /////////////////////////////////////////////////////////////////////
' // "ResultCodeExtended" Property Constants for Scanner
' /////////////////////////////////////////////////////////////////////
Public Const OPOS_ELOCK_NOTSUPPORTDEVICE As Long = 1& + LOCKERREXT      ' // Device is not supported
Public Const OPOS_ELOCK_KBHOOKOPEN As Long = 2& + LOCKERREXT            ' // KeyBoardHookDriver Open Error
Public Const OPOS_ELOCK_KBHOOKSTART As Long = 3& + LOCKERREXT           ' // KeyBoardHookDriver Start Error
Public Const OPOS_ELOCK_KBHOOKSTOP As Long = 4& + LOCKERREXT            ' // KeyBoardHookDriver Stop Error
Public Const OPOS_ELOCK_KBHOOKCLOSE As Long = 5& + LOCKERREXT           ' // KeyBoardHookDriver Close Error
Public Const OPOS_ELOCK_FAILURE As Long = 6& + LOCKERREXT               ' // 

' /////////////////////////////////////////////////////////////////////
' //
' // EPSNMICR.H
' //
' //    header file for OPOS Applications.
' //
' // Modification history
' // ------------------------------------------------------------------
' // 96-05-14 OPOS Release 1.0                                     RYU
' //
' /////////////////////////////////////////////////////////////////////

' /////////////////////////////////////////////////////////////////////
' // DirectIO Command
Public Const MICR_DI_CLEANING As Long = 0&  
Public Const MICR_DI_GETSTATUS As Long = 1&  
Public Const MICR_DI_RECOVER_ERROR As Long = 5&  
Public Const MICR_DI_SELECT_CHECK_FONT As Long = 6&  

' /////////////////////////////////////////////////
' // pData

' // Dummy
Public Const MICR_DI_DUMMY As Long = 0&  
' // Select Check Font
Public Const MICR_DI_MICR_CHECK_E13B As Long = 1&  
Public Const MICR_DI_MICR_CHECK_CMC7 As Long = 2&  

' /////////////////////////////////////////////////////////////////////
' // ResultCodeExtennded
Public Const OPOS_EMICR_ERRORDEVICESTATUS As Long = MICRERREXT + 1&     ' // Not used
Public Const OPOS_EMICR_DATAERROR As Long = MICRERREXT + 2&  
Public Const OPOS_EMICR_COMPORT As Long = MICRERREXT + 3&  
Public Const OPOS_EMICR_DATAEND As Long = MICRERREXT + 4&  
Public Const OPOS_EMICR_DIGITERROR As Long = MICRERREXT + 7&  

' /////////////////////////////////////////////////////////////////////
' //
' // EPSNMSR.H
' //
' //   MSR header file for EPSON Applications.
' //
' // Modification history
' // ------------------------------------------------------------------
' //
' /////////////////////////////////////////////////////////////////////

' /////////////////////////////////////////////////////////////////////
' // "ResultCodeExtended" Property Constants for Scanner
' /////////////////////////////////////////////////////////////////////
Public Const OPOS_EMSR_NOTSUPPORTDEVICE As Long = 1& + MSRERREXT    ' // Device is not supported
Public Const OPOS_EMSR_KBHOOKOPEN As Long = 2& + MSRERREXT          ' // KeyBoardHookDriver Open Error
Public Const OPOS_EMSR_KBHOOKSTART As Long = 3& + MSRERREXT         ' // KeyBoardHookDriver Start Error
Public Const OPOS_EMSR_KBHOOKSTOP As Long = 4& + MSRERREXT          ' // KeyBoardHookDriver Stop Error
Public Const OPOS_EMSR_KBHOOKCLOSE As Long = 5& + MSRERREXT         ' // KeyBoardHookDriver Close Error
Public Const OPOS_EMSR_FAILURE As Long = 6& + MSRERREXT             ' // 

' /////////////////////////////////////////////////////////////////////
' // "ErrorEvent" Event: "ResultCodeExtended" Parameter Constants
' /////////////////////////////////////////////////////////////////////
Public Const OPOS_EMSR_SEPARATOR As Long = 10& + MSRERREXT              ' // 
Public Const OPOS_EMSR_ACCOUNTNUMBER As Long = 11& + MSRERREXT          ' // 
Public Const OPOS_EMSR_TITLE As Long = 12& + MSRERREXT                  ' // 
Public Const OPOS_EMSR_SECONDFIELD As Long = 13& + MSRERREXT            ' // 
Public Const OPOS_EMSR_EXPIRATIONDATA As Long = 14& + MSRERREXT         ' // 
Public Const OPOS_EMSR_SERVICECODE As Long = 15& + MSRERREXT            ' // 
Public Const OPOS_EMSR_EXPIRATIONDATE As Long = OPOS_EMSR_EXPIRATIONDATA  

' /////////////////////////////////////////////////////////////////////
' //
' // EPSNPTR.H
' //
' //   POS Printer header file for OPOS Applications.
' //
' // Modification history
' // ------------------------------------------------------------------
' //
' /////////////////////////////////////////////////////////////////////

' /////////////////////////////////////////////////////////////////////
' // DirectIO Method Constants
' /////////////////////////////////////////////////////////////////////

' /////////////////////////////////////////////////
' // Command

' // Output Data Command
Public Const PTR_DI_OUTPUT_NORMAL As Long = 100&  
Public Const PTR_DI_OUTPUT_REALTIME As Long = 101&  
' // Bitmap Command
Public Const PTR_DI_SET_BITMAP_MODE As Long = 110&  
Public Const PTR_DI_PRINT_FLASH_BITMAP As Long = 111&  
Public Const PTR_DI_PRINT_FLASH_BITMAP2 As Long = 112&  
Public Const PTR_DI_DELETE_NVIMAGE As Long = 116&  
' // Select Slip or Validation 
Public Const PTR_DI_SELECT_SLIP As Long = 120&  
Public Const PTR_DI_SLIP_CHANGE_SIDE As Long = 121&  
' // Maintenance Counter
Public Const PTR_DI_RESET_MAINTENANCE_COUNTER As Long = 130&  
Public Const PTR_DI_GET_MAINTENANCE_COUNTER As Long = 131&  
' // International character set
Public Const PTR_DI_SET_INTERNATIONAL_CHAR As Long = 140&  
' // Wait for output
Public Const PTR_DI_WAIT_FOR_OUTPUT As Long = 150&  
' // Panel switch
Public Const PTR_DI_PANEL_SWITCH As Long = 160&  
' // GetSupportFunction
Public Const PTR_DI_GET_SUPPORT_FUNCTION As Long = 170&  
' // Select page mode
Public Const PTR_DI_SELECT_PAGE_MODE As Long = 180&  

' // The Label Printer Command
Public Const PTR_DI_LABEL_REMOVE As Long = 200&  
Public Const PTR_DI_LABEL_SET_PRINT_MODE As Long = 201&  
Public Const PTR_DI_LABEL_SET_COUNT_MODE As Long = 202&  
Public Const PTR_DI_LABEL_PRINT_COUNT As Long = 203&  
Public Const PTR_DI_LABEL_SET_COUNT_VALUE As Long = 204&  
' // Recover error
Public Const PTR_DI_RECOVER_ERROR As Long = 300&  
' // Hardware reset
Public Const PTR_DI_HARDWARE_RESET As Long = 301&  
' // Announciator
Public Const PTR_DI_ANC_BUZZER As Long = 400&  
Public Const PTR_DI_ANC_LED_GREEN As Long = 401&  
Public Const PTR_DI_ANC_LED_RED As Long = 402&  

Public Const PTR_DI_DELAYED_CUT As Long = 500&  
Public Const PTR_DI_CUT_AND_FEED_TOF As Long = 501&  

Public Const PTR_DI_DRAWLINE As Long = 650&  
Public Const PTR_DI_DRAWRECTANGLE As Long = 651&  

Public Const PTR_DI_SET_PAPERLAYOUT As Long = 700&  
Public Const PTR_DI_GET_PAPERLAYOUT As Long = 701&  

Public Const PTR_DI_OPERATION_MODE As Long = 750&  

' // Code128
Public Const PTR_DI_CODE128_TYPE As Long = 800&  

' // Slip DoubleStrike
Public Const PTR_DI_SLIP_EMPHASIS As Long = 900&  

' // Ring Buzzer
Public Const PTR_DI_RING_BUZZER As Long = 1000&                     ' // for TM-P60
Public Const PTR_DI_RING_BUZZER_WITH_TIME As Long = 1001&           ' // for UB-E02A/UB-R02A use
                                                                    ' // GetBatteryStatus
Public Const PTR_DI_GET_BATTERY_STATUS As Long = 1100&  

' // Select fontpage
Public Const PTR_DI_SELECT_FONTPAGE As Long = 1200&  

' // Unite image and barcode image
Public Const PTR_DI_UNITE_DATA_MODE As Long = 1300&  

' // SpecialFontMode
Public Const PTR_DI_SPECIAL_FONT_MODE As Long = 1400&  

' // SoundMelody
Public Const PTR_DI_SOUND_MELODY As Long = 1500&  

' // Set Bitmap Printing Type
Public Const PTR_DI_SET_BITMAP_PRINTING_TYPE As Long = 1600&  

' // Set Slip Rotate Font Type
Public Const PTR_DI_SET_SLIP_ROTATE_FONT_TYPE As Long = 1700&  

' // Print Franking
Public Const PTR_DI_PRINT_FRANKING As Long = 1800&  

' // Offline Condition
Public Const PTR_DI_GET_OFFLINE_CONDITION As Long = 1900&  

' // Select Slip Paper Type
Public Const PTR_DI_SELECT_SLIP_PAPER_TYPE As Long = 2000&  

' /////////////////////////////////////////////////
' // pData

' // Dummy
Public Const PTR_DI_DUMMY As Long = 0&  
' // Output Mode
Public Const PTR_DI_ROTATE As Long = 1&  
Public Const PTR_DI_TRANSACTION As Long = 2&  
' // Bitmap Mode
Public Const PTR_DI_BMP_NORMAL As Long = 0&  
Public Const PTR_DI_BMP_DOWNLOAD As Long = 1&  
Public Const PTR_DI_BMP_LUSTER As Long = 2&  
' // Delete NV Image
Public Const PTR_DI_DELETE_ALL As Long = -1&  
' // Select Slip or Validation 
Public Const PTR_DI_SLIP_FULLSLIP As Long = 0&  
Public Const PTR_DI_SLIP_VALIDATION As Long = 1&  
' // Select the printing side 
Public Const PTR_DI_SLIP_FRONT_SIDE As Long = 0&  
Public Const PTR_DI_SLIP_REVERSE_SIDE As Long = 1&  
' // GetSupportFunction
Public Const PTR_DI_VALIDATION As Long = &H1&  
Public Const PTR_DI_EMPHASIS As Long = &H2&  
' // SelectPageMode
Public Const PTR_DI_NORMAL_DOT_PAGE_MODE As Long = 0&  
Public Const PTR_DI_HALF_DOT_PAGE_MODE As Long = 1&  
' // Label Print Mode
Public Const PTR_DI_LABEL_RIGHT_SPACE As Long = 0&  
Public Const PTR_DI_LABEL_RIGHT_ZERO As Long = 1&  
Public Const PTR_DI_LABEL_LEFT_SPACE As Long = 2&  
' // International character set
Public Const PTR_DI_CHAR_USA As Long = 0&  
Public Const PTR_DI_CHAR_FRANCE As Long = 1&  
Public Const PTR_DI_CHAR_GERMANY As Long = 2&  
Public Const PTR_DI_CHAR_UK As Long = 3&  
Public Const PTR_DI_CHAR_DENMARK1 As Long = 4&  
Public Const PTR_DI_CHAR_SWEDEN As Long = 5&  
Public Const PTR_DI_CHAR_ITALY As Long = 6&  
Public Const PTR_DI_CHAR_SPAIN1 As Long = 7&  
Public Const PTR_DI_CHAR_JAPAN As Long = 8&  
Public Const PTR_DI_CHAR_NORWAY As Long = 9&  
Public Const PTR_DI_CHAR_DENMARK2 As Long = 10&  
Public Const PTR_DI_CHAR_SPAIN2 As Long = 11&  
Public Const PTR_DI_CHAR_LATIN_AMERICA As Long = 12&  
Public Const PTR_DI_CHAR_KOREA As Long = 13&  
Public Const PTR_DI_CHAR_SLOVENIA As Long = 14&  
Public Const PTR_DI_CHAR_CROATIA As Long = 14&  
Public Const PTR_DI_CHAR_CHINA As Long = 15&  
Public Const PTR_DI_CHAR_VIETNAM As Long = 16&  
Public Const PTR_DI_CHAR_ARABIA As Long = 17&  
' // Code128 default code
Public Const PTR_DI_CODE_A As Long = 0&  
Public Const PTR_DI_CODE_B As Long = 1&  
Public Const PTR_DI_CODE_C As Long = 2&  
' // SlipEmphasis
Public Const PTR_DI_DISABLE_EMPHASIS As Long = 0&  
Public Const PTR_DI_ENABLE_EMPHASIS As Long = 1&  
' // GetBatteryStatus
Public Const PTR_DI_POWERED_BY_AC As Long = &H100&  
Public Const PTR_DI_POWERED_BY_BATTERY As Long = &H200&  
Public Const PTR_DI_BATTERY_NEAR_MIDDLE As Long = &H80&  
Public Const PTR_DI_BATTERY_NEAR_LOW As Long = &H40&  
Public Const PTR_DI_BATTERY_LOW As Long = &H20&  
Public Const PTR_DI_BATTERY_FULL As Long = &H10&  
Public Const PTR_DI_BATTERY_MIDDLE As Long = &H8&  
Public Const PTR_DI_BATTERY_NEAR_EMPTY As Long = &H4&  
Public Const PTR_DI_BATTERY_CLOSE_EMPTY As Long = &H2&  
Public Const PTR_DI_BATTERY_REMOVED As Long = &H1&  
' // Select fontpage
Public Const PTR_DI_THAICODE42 As Long = 20&  
Public Const PTR_DI_THAICODE11 As Long = 21&  
Public Const PTR_DI_THAICODE13 As Long = 22&  
Public Const PTR_DI_THAICODE14 As Long = 23&  
Public Const PTR_DI_THAICODE16 As Long = 24&  
Public Const PTR_DI_THAICODE17 As Long = 25&  
Public Const PTR_DI_THAICODE18 As Long = 26&  
Public Const PTR_DI_TCVN3_PAGE1 As Long = 30&  
Public Const PTR_DI_TCVN3_PAGE2 As Long = 31&  
' // Line Thickness
Public Const PTR_DI_LINE_THIN As Long = 1&  
Public Const PTR_DI_LINE_NORMAL As Long = 2&  
Public Const PTR_DI_LINE_THICK As Long = 3&  
' // Operation Mode
Public Const PTR_DI_SERIAL_MODE As Long = 0&  
Public Const PTR_DI_PEEL_OFF_MODE As Long = 1&  

' // Unite data mode
Public Const PTR_DI_UNITE_EXIT As Long = &H0&  

Public Const PTR_DI_UNITE_TRANSPARENT As Long = &H1&  
Public Const PTR_DI_UNITE_OPAQUE As Long = &H2&  

Public Const PTR_DI_UNITE_UPPER_ALIGNMENT As Long = &H100&  
Public Const PTR_DI_UNITE_MIDDLE_ALIGNMENT As Long = &H200&  
Public Const PTR_DI_UNITE_LOWER_ALIGNMENT As Long = &H400&  

' // SpecialFontMode
Public Const PTR_DI_FONT_NORMAL As Long = 0&  
Public Const PTR_DI_FONT_SPECIAL As Long = 1&  

' // Bitmap Printing Type
Public Const PTR_DI_BITMAP_PRINTING_NORMAL As Long = 0&  
Public Const PTR_DI_BITMAP_PRINTING_MULTI_TONE As Long = 1&  

' // Sound Melody Pattern
Public Const PTR_DI_SOUND_PATTERN_1 As Long = 1&  
Public Const PTR_DI_SOUND_PATTERN_2 As Long = 2&  
Public Const PTR_DI_SOUND_PATTERN_3 As Long = 3&  
Public Const PTR_DI_SOUND_PATTERN_4 As Long = 4&  
Public Const PTR_DI_SOUND_PATTERN_5 As Long = 5&  
Public Const PTR_DI_SOUND_PATTERN_ERROR As Long = 100&  
Public Const PTR_DI_SOUND_PATTERN_NOPAPER As Long = 101&  

' // Slip Rotate Font Type
Public Const PTR_DI_ROTATE_FONT_A As Long = 0&  
Public Const PTR_DI_ROTATE_FONT_B As Long = 1&  

' // Offline Condition
Public Const PTR_DI_CONDITION_ONLINE As Long = 0&  
Public Const PTR_DI_CONDITION_RECEIPT_ONLY_OFFLINE As Long = 1&  
Public Const PTR_DI_CONDITION_SLIP_ONLY_OFFLINE As Long = 2&  
Public Const PTR_DI_CONDITION_OFFLINE_EXECUTE As Long = 3&  
Public Const PTR_DI_CONDITION_RECOVERBLE As Long = 4&  
Public Const PTR_DI_CONDITION_UNRECOVERBLE As Long = 5&  

' // Select Slip Paper Type
Public Const PTR_DI_SLIP_PAPER_NORMAL As Long = 1&  
Public Const PTR_DI_SLIP_PAPER_COPY As Long = 2&  

' /////////////////////////////////////////////////////////////////////
' // "ResultCodeExtended" Property Constants for Printer
' /////////////////////////////////////////////////////////////////////
Public Const OPOS_EPTR_BADSTATION As Long = 1& + PTRERREXT      ' // invalid station
Public Const OPOS_EPTR_NOSTATION As Long = 2& + PTRERREXT       ' // station not present

Public Const OPOS_EPTR_UNRECOVERABLE As Long = 3& + PTRERREXT  
Public Const OPOS_EPTR_CUTTER As Long = 4& + PTRERREXT  
Public Const OPOS_EPTR_MECHANICAL As Long = 5& + PTRERREXT  
Public Const OPOS_EPTR_OVERHEAT As Long = 6& + PTRERREXT        ' // This constant is provided only for compatibility.
Public Const OPOS_EPTR_AUTORECOVERABLE As Long = 6& + PTRERREXT  
Public Const OPOS_EPTR_ROTATE90 As Long = 7& + PTRERREXT  
Public Const OPOS_EPTR_LABEL_REMOVAL As Long = 8& + PTRERREXT  
Public Const OPOS_EPTR_BUTTON_OPERATION As Long = 9& + PTRERREXT  
Public Const OPOS_EPTR_LABEL_JAM As Long = 10& + PTRERREXT   
Public Const OPOS_EPTR_REMOVE_BUTTON As Long = 11& + PTRERREXT  

' /////////////////////////////////////////////////////////////////////
' // "StatusUpdateEvent" Event: "Data" Parameter Constants
' /////////////////////////////////////////////////////////////////////

' // Following constants are provided only for compatibility.
Public Const PTR_SUE_BLACK_INK_EMPTY As Long = 7& + 2000&  
Public Const PTR_SUE_BLACK_INK_NEAREMPTY As Long = 8& + 2000&  
Public Const PTR_SUE_BLACK_INK_OK As Long = 9& + 2000&  
Public Const PTR_SUE_BLACK_INK_CARTRIDGE_REMOVED As Long = 10& + 2000&  
Public Const PTR_SUE_BLACK_INK_CARTRIDGE_OK As Long = 11& + 2000&  
Public Const PTR_SUE_BLACK_HEAD_BEGIN_CLEANING As Long = 12& + 2000&  
Public Const PTR_SUE_BLACK_HEAD_END_CLEANING As Long = 13& + 2000&  

' // Battery status
Public Const PTR_SUE_POWERED_BY_AC As Long = 1& + 100000&  
Public Const PTR_SUE_POWERED_BY_BATTERY As Long = 2& + 100000&  
Public Const PTR_SUE_BATTERY_FULL As Long = 3& + 100000&  
Public Const PTR_SUE_BATTERY_MIDDLE As Long = 4& + 100000&  
Public Const PTR_SUE_BATTERY_NEAR_EMPTY As Long = 5& + 100000&  
Public Const PTR_SUE_BATTERY_CLOSE_EMPTY As Long = 6& + 100000&  
Public Const PTR_SUE_BATTERY_OK As Long = 7& + 100000&  
Public Const PTR_SUE_BATTERY_REMOVED As Long = 8& + 100000&  
Public Const PTR_SUE_BATTERY_NEAR_MIDDLE As Long = 9& + 100000&  
Public Const PTR_SUE_BATTERY_NEAR_LOW As Long = 10& + 100000&  
Public Const PTR_SUE_BATTERY_LOW As Long = 11& + 100000&  

' /////////////////////////////////////////////////////////////////////
' // "DirectIOEvent" Event: "Data" Parameter Constants
' /////////////////////////////////////////////////////////////////////
Public Const PTR_DIE_SET_BITMAP_MODE As Long = 110&  
Public Const PTR_DIE_LABEL_REMOVAL As Long = 111&  
Public Const PTR_DIE_LABEL_REMOVE_OK As Long = 112&  
Public Const PTR_DIE_BUTTON_OPERATION As Long = 113&  
Public Const PTR_DIE_LABEL_JAM As Long = 114&  
Public Const PTR_DIE_BUTTON_OK As Long = 115&   

' /////////////////////////////////////////////////
' // pData

' // PTR_DIE_SET_BITMAP_MODE
Public Const PTR_DIE_MEMORY As Long = 1&  
Public Const PTR_DIE_VRAM As Long = 2&  
Public Const PTR_DIE_NVRAM As Long = 3&  

' /////////////////////////////////////////////////////////////////////
' //
' // EPSNSCAN.H
' //
' //   SCANNER header file for OPOS Applications.
' //
' // Modification history
' // ------------------------------------------------------------------
' //
' /////////////////////////////////////////////////////////////////////

' /////////////////////////////////////////////////////////////////////
' // "ResultCodeExtended" Property Constants for Scanner
' /////////////////////////////////////////////////////////////////////
Public Const OPOS_ESCAN_PORTCOMM As Long = 1& + SCANERREXT      ' // 
Public Const OPOS_ESCAN_DATAFORMAT As Long = 2& + SCANERREXT    ' // 
Public Const OPOS_ESCAN_DATAEND As Long = 3& + SCANERREXT       ' // 
Public Const OPOS_ESCAN_FAILURE As Long = 4& + SCANERREXT       ' // 
Public Const OPOS_ESCAN_NOTRESPONSE As Long = 5& + SCANERREXT   ' // 
Public Const OPOS_ESCAN_LOCKED As Long = 6& + SCANERREXT        ' // 

' /////////////////////////////////////////////////////////////////////
' // "DirectIO" Method Constants for Scanner
' /////////////////////////////////////////////////////////////////////
Public Const OPOS_SCAN_OUTPUT As Long = 0&              ' // 

Public Const OPOS_SCAN_MULTI As Long = 1&           ' // 

Public Const OPOS_SCAN_RESET As Long = 10&              ' // 
Public Const OPOS_SCAN_ENABLE As Long = 11&             ' // 
Public Const OPOS_SCAN_NOINDICATION As Long = 12&       ' // 
Public Const OPOS_SCAN_STATUS As Long = 13&             ' // 
Public Const OPOS_SCAN_SWITCHREAD As Long = 14&         ' //
Public Const OPOS_SCAN_NOTONFILE As Long = 15&          ' //
Public Const OPOS_SCAN_REDLIGHTFLASH As Long = 16&      ' //
                                                        ' //const LONG OPOS_SCAN_DISP_DATA		= 17;	//
Public Const OPOS_SCAN_DISP_STATUS As Long = 17&        ' //

' /////////////////////////////////////////////////////////////////////
' //
' // EPSNTOT.H
' //
' //   Hard Totals header file for OPOS Applications.
' //
' // Modification history
' // ------------------------------------------------------------------
' //
' /////////////////////////////////////////////////////////////////////

' /////////////////////////////////////////////////////////////////////
' // "ResultCodeExtended" Property Constants for HTotals
' /////////////////////////////////////////////////////////////////////
Public Const OPOS_ETOT_NOTMAPMEMORY As Long = 1& + TOTERREXT    ' // do not map memory 
Public Const OPOS_ETOT_INIT_DEVICE As Long = 2& + TOTERREXT     ' // do not read initial data of device
Public Const OPOS_ETOT_READFILE As Long = 3& + TOTERREXT        ' // do not read data
Public Const OPOS_ETOT_WRITEFILE As Long = 4& + TOTERREXT       ' // do not write data
Public Const OPOS_ETOT_LOCKED As Long = 5& + TOTERREXT          ' // loading another method
Public Const OPOS_ETOT_NODEFRAGMENTATION As Long = 6& + TOTERREXT   ' // do not defragmentation
Public Const OPOS_ETOT_NOMEMORY As Long = 7& + TOTERREXT            ' // no memory
Public Const OPOS_ETOT_DELETE As Long = 8& + TOTERREXT              ' // Deleting the file
Public Const OPOS_ETOT_RWPORT As Long = 9& + TOTERREXT              ' // do not read/write I/O port

' /////////////////////////////////////////////////////////////////////
' // "DirectIO" Method Constants for HTotals
' /////////////////////////////////////////////////////////////////////
Public Const TOT_DI_BACKUP As Long = 1&             ' //Backup 
Public Const TOT_DI_DEFRAGMENTATION As Long = 2&    ' //Defragmentation 

' /////////////////////////////////////////////////////////////////////
' // "DirectIOEvent" Event Constants for HTotals
' /////////////////////////////////////////////////////////////////////
Public Const TOT_DIE_FORWARD As Long = 1&           ' // 
Public Const TOT_DIE_ROLLBACK As Long = 2&          ' // 

