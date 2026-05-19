VERSION 5.00
Object = "{CCB90230-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSCheckScanner.ocx"
Begin VB.Form Step1 
   BorderStyle     =   4  'Fixed ToolWindow
   Caption         =   "Step 1 Normal operation:Read data."
   ClientHeight    =   3435
   ClientLeft      =   45
   ClientTop       =   285
   ClientWidth     =   4440
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3435
   ScaleWidth      =   4440
   ShowInTaskbar   =   0   'False
   StartUpPosition =   3  'Windows Default
   Begin VB.CommandButton cmdExit 
      Caption         =   "Exit"
      Height          =   420
      Left            =   3000
      TabIndex        =   1
      Top             =   2280
      Width           =   945
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Read"
      Height          =   690
      Left            =   1200
      TabIndex        =   0
      Top             =   1050
      Width           =   2745
   End
   Begin OposCheckScanner_CCOCtl.OPOSCheckScanner OPOSCheckScanner1 
      Left            =   2280
      OleObjectBlob   =   "sChkScan1.frx":0000
      Top             =   2280
   End
   Begin VB.Label Label2 
      Caption         =   "DataSize :"
      Height          =   345
      Left            =   240
      TabIndex        =   2
      Top             =   270
      Width           =   1035
   End
   Begin VB.Label Label1 
      BorderStyle     =   1  'Fixed Single
      Height          =   345
      Left            =   1350
      TabIndex        =   3
      Top             =   240
      Width           =   2595
   End
End
Attribute VB_Name = "Step1"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 1 Normal operation:Read data.
Option Explicit

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
        
        'Timeout function.
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
        
        'Read TIFF file format
        .ImageFormat = CHK_IF_TIFF
        
        'Read BMP file format
        '.ImageFormat = CHK_IF_BMP
        
        'Read JPEG file format
        '.ImageFormat = CHK_IF_JPEG
        
    End With
    
    Exit Sub
    
    'Go to
    'Disable button
LoadError:
    
    For Each OBJChkScan In Me
        If OBJChkScan.Name <> "OPOSCheckScanner1" Then
            OBJChkScan.Enabled = False
        End If
    Next
    
    'Enabled exit botton
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

Private Sub OPOSCheckScanner1_DataEvent(ByVal Status As Long)
    
    'Dispay ImageDataSize
    Label1.Caption = CStr(GetDataSize) & " byte"
    
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
