VERSION 5.00
Object = "{CCB90230-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSCheckScanner.ocx"
Begin VB.Form Step3 
   BorderStyle     =   4  'Fixed ToolWindow
   Caption         =   "Step3 Read data stored in the file."
   ClientHeight    =   4560
   ClientLeft      =   45
   ClientTop       =   285
   ClientWidth     =   5835
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   4560
   ScaleWidth      =   5835
   ShowInTaskbar   =   0   'False
   StartUpPosition =   3  'Windows Default
   Begin VB.CommandButton Command2 
      Caption         =   "Store"
      Height          =   690
      Left            =   1290
      TabIndex        =   1
      Top             =   2190
      Width           =   2745
   End
   Begin VB.CommandButton Command3 
      Caption         =   "CreateFile"
      Height          =   690
      Left            =   1290
      TabIndex        =   2
      Top             =   3240
      Width           =   2745
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Exit"
      Height          =   420
      Left            =   4410
      TabIndex        =   3
      Top             =   3990
      Width           =   945
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Read"
      Height          =   690
      Left            =   1290
      TabIndex        =   0
      Top             =   1140
      Width           =   2745
   End
   Begin OposCheckScanner_CCOCtl.OPOSCheckScanner OPOSCheckScanner1 
      Left            =   4680
      OleObjectBlob   =   "sChkScan3.frx":0000
      Top             =   1680
   End
   Begin VB.Label Label2 
      Caption         =   "DataSize :"
      Height          =   345
      Left            =   1140
      TabIndex        =   7
      Top             =   150
      Width           =   825
   End
   Begin VB.Label Label1 
      BorderStyle     =   1  'Fixed Single
      Height          =   345
      Left            =   2280
      TabIndex        =   6
      Top             =   120
      Width           =   3075
   End
   Begin VB.Label Label3 
      BorderStyle     =   1  'Fixed Single
      Height          =   345
      Left            =   2280
      TabIndex        =   5
      Top             =   600
      Width           =   3075
   End
   Begin VB.Label Label4 
      Caption         =   "Rest number of ""Store"" :"
      Height          =   345
      Left            =   120
      TabIndex        =   4
      Top             =   600
      Width           =   2025
   End
End
Attribute VB_Name = "Step3"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 3 Read data stored in the file.
Option Explicit
Private m_cscnPath As String 'path .bmp or .tif or .jpg

Private Sub cmdExit_Click()

    'Close Aplication
    Unload Me
    
End Sub

Private Sub Command1_Click()
    
    'Data size clear
    Label1.Caption = ""
    DoEvents
    
    With OPOSCheckScanner1
    
        'EventClear
        .ClearInput
        
        'Ready to fired event
        .DataEventEnabled = True
                        
        'Add timeout function.
        While .BeginInsertion(3000) = OPOS_E_TIMEOUT
            If (MsgBox("Please insert a check.", vbOKCancel + vbQuestion) = vbCancel) Then
                .EndInsertion
                Exit Sub
            End If
            DoEvents
        Wend
                
        'Set paper & Scanning
        .EndInsertion
        
        'Call to retrieve an image to the ImageData proparty
        .RetrieveImage CHK_CROP_AREA_ENTIRE_IMAGE
        
    End With
    
End Sub

Private Sub Command2_Click()

    With OPOSCheckScanner1
        'Set FileID
        .FileID = "Epson CheckScanner SampleProgram Step3"
    
        'Set FileID
        .ImageTagData = "Epson CheckScanner SampleProgram Step3 ImageTagData"
    
        'Clear Image Data File
        .ClearImage CHK_CLR_BY_FILEID
        
        'StoreImage
        .StoreImage CHK_CROP_AREA_ENTIRE_IMAGE
        
        'Displayed "rest number"
        Label3.Caption = CStr(.RemainingImagesEstimate)
        
    End With
    
    MsgBox ("A data was stored.")
    
End Sub

Private Sub Command3_Click()
    
    'CreateFile
    Call CreateFile(GetDataSize)
    
    'CreateFile button Disable
    Command3.Enabled = False
    
    'finish message
    MsgBox ("A file was created")
    
End Sub

Private Sub Form_Load()
    
    Dim OBJChkScan As Object

    With OPOSCheckScanner1
    
        'Open the device
        'Use a Logical Device Name which has been set on the SetupPOS.
        .Open "Unit1"
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "This device has not been registered, or cannot use."
            GoTo LoadError
        End If
        
        'Get the exclusive control right for the opened device.
        'Then the device is disable from other application.
        
        '(Notice:When using an old CO, use the Claim.)
        .ClaimDevice 1000
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to get the exclusive right for the device."
            GoTo LoadError
        End If
        
        'Power reporting
        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If
        
        'Enable the device.
        .DeviceEnabled = True
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Now the device is disable to use."
            GoTo LoadError
        End If
        
        'Ready to fired event
        .DataEventEnabled = True
        
        'Read TIFF file
        .ImageFormat = CHK_IF_TIFF
        
        'Read BMP file format
        '.ImageFormat = CHK_IF_BMP
        
        'Read JPEG file format
        '.ImageFormat = CHK_IF_JPEG
        
        
        Select Case .ImageFormat
        Case CHK_IF_TIFF
            m_cscnPath = "\Step3.tif" 'case .tif
        Case CHK_IF_BMP
            m_cscnPath = "\Step3.bmp" 'case .bmp
        Case CHK_IF_JPEG
            m_cscnPath = "\Step3.jpg" 'case .jpg
        Case Else
            m_cscnPath = "\Step3.bmp" 'case .bmp
        End Select
        
    End With
    
    'Disable "Store" button
    Command2.Enabled = False
    
    'Disable "CreateFile" button
    Command3.Enabled = False

    Exit Sub
    
    'Go to
    'Disable button
LoadError:
    
    For Each OBJChkScan In Me
        If OBJChkScan.Name <> "OPOSCheckScanner1" Then
            OBJChkScan.Enabled = False
        End If
    Next
    
    'Enabled exit button
    cmdExit.Enabled = True              'Only the exit button is enabled.
    
End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSCheckScanner1
    
        'Cancel the device
        .DeviceEnabled = False
        
        'Release the device exclusive control right.
        '(Notice:When using an old CO, use the Release.)
        .ReleaseDevice
        
        'Finish using the device.
        .Close
        
    End With
    
End Sub

Private Sub OPOSCheckScanner1_ErrorEvent(ByVal ResultCode As Long, ByVal ResultCodeExtended As Long, ByVal ErrorLocus As Long, pErrorResponse As Long)
    
    'Error MessageBox
    MsgBox "CheckScanner Error!" + vbCrLf + vbCrLf + "ResultCode = " + CStr(ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(ResultCodeExtended)
    
    'Begin removal
    If ResultCode = OPOS_E_ILLEGAL Then
        With OPOSCheckScanner1
            .BeginRemoval OPOS_FOREVER
            .EndRemoval
        End With
    End If
    
End Sub

Private Sub OPOSCheckScanner1_DataEvent(ByVal Status As Long)
    
    'Dispay ImageDataSize
    Label1.Caption = CStr(GetDataSize) & " byte"
    
    'Enable "Store" button
    Command2.Enabled = True
    
    'Enable "Create a file" button
    Command3.Enabled = True
    
End Sub

Private Function GetDataSize() As Long

    Dim strIMSizeData As String
    Dim lImageDataSize As Long
    Dim lNowBinaryConversion As Long
    
    With OPOSCheckScanner1
    
        'Now BinaryConversion
        lNowBinaryConversion = .BinaryConversion
        
        'SetBinaryConversion
        .BinaryConversion = OPOS_BC_NIBBLE
        
        'Copy to ImageData
        strIMSizeData = .ImageData
        
        'GetDataSize
        lImageDataSize = Len(strIMSizeData) / 2
    
        'Re BinaryConversion
        .BinaryConversion = lNowBinaryConversion
            
    End With
    
    'Return ImageDataSize
    GetDataSize = lImageDataSize
    
End Function

Private Sub CreateFile(ByRef lImDataSize As Long)

    Dim rtBNext As Long   'See part of 2byte
    Dim rtBLen As Long    'Byte Array Count
    Dim strHigh As String 'byte High
    Dim strLow As String  'byte Low
    Dim strIMData As String 'Main Data
    Dim bytTrans() As Byte 'dynamic array declaration statement
    Dim lNowBinaryConversion As Long 'Now BinaryConversion

    rtBNext = 1 'start position
    
    With OPOSCheckScanner1
    
        'Now BinaryConversion
        lNowBinaryConversion = .BinaryConversion
        
        'SetBinaryConversion
        .BinaryConversion = OPOS_BC_NIBBLE
        
        'Copy to ImageData
        strIMData = .ImageData

        ReDim bytTrans(lImDataSize - 1) '2byte--->1byte
        
        For rtBLen = 0 To lImDataSize - 1
            strHigh = Mid(strIMData, rtBNext, 1) 'first string
            strLow = Mid(strIMData, rtBNext + 1, 1) 'second string
            rtBNext = rtBNext + 2
            bytTrans(rtBLen) = CByte(ChangeAsc(strHigh) * 16 + ChangeAsc(strLow))
            DoEvents
        Next rtBLen
        
        'Save file for binary mode
        Open App.Path & m_cscnPath For Binary As #1
            Put #1, , bytTrans
        Close #1
        
        'Re BinaryConversion
        .BinaryConversion = lNowBinaryConversion
        
    End With
    
End Sub

'change specialized epson string
Private Function ChangeAsc(strCmd As String) As Byte
    
    Select Case strCmd
        Case ":"
            ChangeAsc = 10
        Case ";"
            ChangeAsc = 11
        Case "<"
            ChangeAsc = 12
        Case "="
            ChangeAsc = 13
        Case ">"
            ChangeAsc = 14
        Case "?"
            ChangeAsc = 15
        Case Else
            ChangeAsc = CByte(strCmd)
    End Select
    
End Function

