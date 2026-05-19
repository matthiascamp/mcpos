VERSION 5.00
Object = "{CCB90080-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSTotals.ocx"
Begin VB.Form Step6 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 6 Obtains the statistics of the device."
   ClientHeight    =   3690
   ClientLeft      =   45
   ClientTop       =   330
   ClientWidth     =   6030
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3690
   ScaleWidth      =   6030
   Begin VB.Frame Frame5 
      Caption         =   "Device Statistics"
      Height          =   1440
      Left            =   120
      TabIndex        =   10
      Top             =   2160
      Width           =   3000
      Begin VB.TextBox txtRetrieveSt 
         Height          =   285
         Left            =   100
         TabIndex        =   12
         Top             =   530
         Width           =   2775
      End
      Begin VB.CommandButton cmdRetrieveSt 
         Caption         =   "Retrieve Statistics"
         Height          =   435
         Left            =   100
         TabIndex        =   11
         Top             =   870
         Width           =   2775
      End
      Begin VB.Label Label6 
         Caption         =   "RetrieveStatistics parameter"
         Height          =   255
         Left            =   100
         TabIndex        =   13
         Top             =   300
         Width           =   2775
      End
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   4800
      TabIndex        =   9
      Top             =   3120
      Width           =   990
   End
   Begin VB.CommandButton Command5 
      Caption         =   "Delete"
      Height          =   330
      Left            =   120
      TabIndex        =   5
      Top             =   1200
      Width           =   1305
   End
   Begin VB.TextBox Text4 
      Height          =   285
      Left            =   1560
      TabIndex        =   4
      Top             =   765
      Width           =   2010
   End
   Begin VB.TextBox Text3 
      Height          =   285
      Left            =   1560
      TabIndex        =   2
      Top             =   285
      Width           =   2010
   End
   Begin VB.CommandButton Command4 
      Caption         =   "Change"
      Height          =   330
      Left            =   120
      TabIndex        =   3
      Top             =   720
      Width           =   1305
   End
   Begin VB.CommandButton Command3 
      Caption         =   "Create"
      Height          =   330
      Left            =   120
      TabIndex        =   1
      Top             =   240
      Width           =   1305
   End
   Begin VB.ListBox List1 
      Height          =   1035
      Left            =   3840
      TabIndex        =   0
      Top             =   360
      Width           =   1965
   End
   Begin VB.TextBox Text1 
      Height          =   285
      Left            =   1560
      TabIndex        =   7
      Top             =   1725
      Width           =   4250
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Register"
      Height          =   345
      Left            =   120
      TabIndex        =   6
      Top             =   1680
      Width           =   1305
   End
   Begin OposTotals_CCOCtl.OPOSTotals OPOSTotals1 
      Left            =   4080
      OleObjectBlob   =   "Totals6.frx":0000
      Top             =   3000
   End
   Begin VB.Label Label1 
      Caption         =   "File List"
      Height          =   225
      Left            =   3840
      TabIndex        =   8
      Top             =   120
      Width           =   1485
   End
End
Attribute VB_Name = "Step6"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 6 Adding error handlers.
Option Explicit

' Make a list of the all files
'
Sub ListRefresh()

    Dim i As Integer
    Dim pFileName As String
    
    pFileName = ""

    OPOSTotals1.FindByIndex 0, pFileName
    List1.Clear
    Do
        i = InStr(pFileName, vbCr)
        If i = 0 Then Exit Do
        List1.AddItem Left(pFileName, i - 1)
        pFileName = Mid(pFileName, i + 1)
    Loop

End Sub

Private Sub cmdExit_Click()

    Unload Me

End Sub

Private Sub cmdRetrieveSt_Click()

    Dim strParam As String
    Dim lLen As Long
    Dim strErrMsg As String
    Dim strXMLPath As String
    Dim strFindXMLPath As String

    strParam = txtRetrieveSt.Text
    strErrMsg = ""
    strFindXMLPath = ""

    ' Obtains the statistics of the device and stores it in a file.
    With OPOSTotals1
        .RetrieveStatistics strParam
        If (.ResultCode <> OPOS_SUCCESS) Then
            strErrMsg = "RetrieveStatistics method error." + vbCrLf + vbCrLf
            strErrMsg = strErrMsg + "ResultCode = " + CStr(.ResultCode) + vbCrLf
            strErrMsg = strErrMsg + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
            MsgBox strErrMsg, vbOKOnly + vbExclamation, "HardTotals"
            Exit Sub
        End If
    End With
    
    strXMLPath = App.Path + "\Sample.xml"
    'Delete XML file.
    strFindXMLPath = Dir(strXMLPath)
    If strFindXMLPath <> "" Then
        Kill (strXMLPath)
    End If
    'Create XML file.
    Open strXMLPath For Binary Access Write As #1
        Put #1, , strParam
    Close #1
    
    ' Opens another window and indicates the information of the XML file.
    Step6Browser.Show

End Sub

' Write information in the selected file
'
Private Sub Command1_Click()

    Dim pSize As Long
    Dim pHandle As Long

    If OPOSTotals1.Find(List1.Text, pHandle, pSize) <> OPOS_SUCCESS Then
        MsgBox "Fails to get the file handle."
        Exit Sub
    End If
    
    If OPOSTotals1.Write(pHandle, Text1.Text, 0, LenDBCS(Text1.Text)) <> OPOS_SUCCESS Then
        MsgBox "Fails to delete."
        Exit Sub
    End If

End Sub

' Make files
'
Private Sub Command3_Click()

    Dim pHandle As Long

' Check whether there is free capacity for maiking files, or not
    If OPOSTotals1.FreeData < 128 Then
        MsgBox "Cannot be secured for the free capacity for the totals device"
        Exit Sub
    End If

' Check on the limit of numbers of the files
'(Only when using the NVRAM as the device, needed to make a limit on files. When using CompactFlash, no need for this.)
    If OPOSTotals1.NumberOfFiles >= 9 Then
        MsgBox "The maximum number of total files are up to 10."
        Exit Sub
    End If

' Create a file name using the text input into the box. Creat it with 128bytes.
    If OPOSTotals1.Create(Text3.Text, pHandle, 128, False) <> OPOS_SUCCESS Then
        MsgBox "Fails to create a file."
        Exit Sub
    End If

    Call ListRefresh                    ' Update the file list.

End Sub

' Modify a file name selected on the list.
'
Private Sub Command4_Click()

    Dim pSize As Long
    Dim pHandle As Long

' Request for a file handle.
    If OPOSTotals1.Find(List1.Text, pHandle, pSize) <> OPOS_SUCCESS Then
        MsgBox "Fails to get the file handle."
        Exit Sub
    End If

' Modigy a file name as input into the text box, using the requested file handle.
    If OPOSTotals1.Rename(pHandle, Text4.Text) <> OPOS_SUCCESS Then
        MsgBox "Fails to rename."
        Exit Sub
    End If

    Call ListRefresh                    ' Update the file list.

End Sub

' Delete the selected files
'
Private Sub Command5_Click()

    If OPOSTotals1.Delete(List1.Text) <> OPOS_SUCCESS Then
        MsgBox "Fails to delete."
        Exit Sub
    End If

    Call ListRefresh                    ' Update the file list.

End Sub


Private Sub Form_Load()

    With OPOSTotals1
        .Open "Unit1"
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "This device has not been registered, or cannot use."
            GoTo LoadError
        End If
        
        .ClaimDevice 1000
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to get the exclusive right for the device."
            GoTo LoadError
        End If
        
        .DeviceEnabled = True
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Now the device is disable to use."
            GoTo LoadError
        End If
        
        ' Set the edit box of parameter input.
        txtRetrieveSt.Text = "ModelName,HoursPoweredCount"
        
        ' Checks whether it has function to obtain
        ' the statistics of devices.
        ' If it does not have the function, invalidates
        ' the [Retrieve Statistics] button and the edit box
        ' of parameter input.
        If .CapStatisticsReporting = False Then
            cmdRetrieveSt.Enabled = False
            txtRetrieveSt.Enabled = False
        End If
        
    End With

    Call ListRefresh                    ' Update the file list.
    Exit Sub

LoadError:
' Nothing can be used.
    Dim OBJ As Object
    'All objects on the form
    For Each OBJ In Me
        'Invalid exept for OPOS OCX
        If OBJ.Name <> "OPOSTotals1" Then
            OBJ.Enabled = False
        End If
    Next
    cmdExit.Enabled = True              'Only the exit button is enabled.

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSTotals1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

'Handle when a file is selected on the list.
'
Private Sub List1_Click()

    Dim pHandle As Long
    Dim pSize As Long
    Dim pData As String
    
    pData = ""

' Copy the selected file name to (Change) button.
    Text4.Text = List1.Text

' Request a file handle from the selected file name.
    If OPOSTotals1.Find(List1.Text, pHandle, pSize) <> OPOS_SUCCESS Then
        MsgBox "Fails to get the file handle."
        Exit Sub
    End If
' Read a registered information from the requested file handle, and display it.
    If OPOSTotals1.Read(pHandle, pData, 0, pSize) <> OPOS_SUCCESS Then
        MsgBox "Fails to delete."
        Exit Sub
    End If

    Text1.Text = pData

End Sub

Function LenDBCS(Data As String) As Long

    Dim i As Integer
    Dim m As Integer
    Dim c As Integer

    m = Len(Data)
    c = 0
    
    For i = 1 To m
        If Asc(Mid(Data, i, 1)) < 0 Then c = c + 1
    Next i

    LenDBCS = m + c

End Function

